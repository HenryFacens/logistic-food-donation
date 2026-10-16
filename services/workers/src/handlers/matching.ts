import {
  calculateMatchingScore,
  estimateEtaMinutes,
  type DonationCategory,
  type MatchingScore,
  type MessageEnvelope,
} from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type { SqlExecutor } from "../infrastructure/database.js";

interface DonationRow extends QueryResultRow {
  id: string;
  status: string;
  category: DonationCategory | null;
  estimated_weight_kg: string;
  perishability_minutes: number;
  expires_at: Date;
}

interface NgoCandidateRow extends QueryResultRow {
  id: string;
  distance_km: string;
  remaining_capacity_kg: string;
  service_radius_km: string;
  accepted_categories: DonationCategory[];
  category_need: string | null;
}

interface RankedCandidate {
  ngoId: string;
  score: MatchingScore;
}

export function rankCandidates(
  donation: Pick<
    DonationRow,
    "category" | "estimated_weight_kg" | "perishability_minutes"
  >,
  rows: NgoCandidateRow[],
): RankedCandidate[] {
  if (!donation.category) {
    return [];
  }
  const weightKg = Number(donation.estimated_weight_kg);
  return rows
    .map((candidate) => {
      const distanceKm = Number(candidate.distance_km);
      const score = calculateMatchingScore({
        distanceKm,
        maxDistanceKm: Number(candidate.service_radius_km),
        ngoRemainingCapacityKg: Number(candidate.remaining_capacity_kg),
        donationWeightKg: weightKg,
        perishabilityMinutes: donation.perishability_minutes,
        etaMinutes: estimateEtaMinutes(distanceKm),
        categoryNeed: Number(candidate.category_need ?? 0),
        acceptsCategory: candidate.accepted_categories.includes(
          donation.category!,
        ),
      });
      return { ngoId: candidate.id, score };
    })
    .sort(
      (left, right) =>
        Number(right.score.eligible) - Number(left.score.eligible) ||
        right.score.total - left.score.total ||
        left.ngoId.localeCompare(right.ngoId),
    );
}

async function finishWithoutDestination(
  transaction: SqlExecutor,
  donation: DonationRow,
  message: MessageEnvelope,
  matchingRunId: string,
  reason: string,
): Promise<void> {
  await transaction.query(
    `
      UPDATE matching_runs
      SET fallback_stage = 'no_destination',
          selected_ngo_id = NULL
      WHERE id = $1
    `,
    [matchingRunId],
  );
  await transaction.query(
    `
      INSERT INTO freight_requests (
        donation_id,
        status,
        provider_name,
        simulated,
        simulation_label
      ) VALUES ($1, 'unavailable', 'Frete parceiro SIMULADO', true, 'SIMULADO')
      ON CONFLICT (donation_id) DO UPDATE
      SET status = 'unavailable',
          updated_at = now()
    `,
    [donation.id],
  );
  await transaction.query(
    `
      SELECT transition_donation(
        $1, 'classified', 'no_destination', 'donation.no_destination', $2,
        $3::jsonb, NULL
      )
    `,
    [
      donation.id,
      message.correlationId,
      JSON.stringify({
        reason,
        fallback: "paid_freight_unavailable",
        simulated: true,
        simulationLabel: "SIMULADO",
      }),
    ],
  );
}

export async function handleMatching(
  message: MessageEnvelope,
  transaction: SqlExecutor,
  offerTimeoutSeconds: number,
): Promise<void> {
  const donationResult = await transaction.query<DonationRow>(
    `
      SELECT
        id,
        status,
        category,
        estimated_weight_kg,
        perishability_minutes,
        expires_at
      FROM donations
      WHERE id = $1
      FOR UPDATE
    `,
    [message.aggregateId],
  );
  const donation = donationResult.rows[0];
  if (!donation || donation.status !== "classified") {
    return;
  }

  if (donation.expires_at <= new Date()) {
    await transaction.query(
      `
        SELECT transition_donation(
          $1, 'classified', 'expired', 'donation.expired', $2,
          '{"reason":"expired_before_matching"}'::jsonb, NULL
        )
      `,
      [donation.id, message.correlationId],
    );
    return;
  }

  const candidateResult = await transaction.query<NgoCandidateRow>(
    `
      SELECT
        ngo.id,
        ST_Distance(ngo.location, donation.pickup_location) / 1000.0
          AS distance_km,
        ngo.capacity_kg - ngo.current_load_kg AS remaining_capacity_kg,
        ngo.service_radius_km,
        ngo.accepted_categories::text[] AS accepted_categories,
        ngo.category_needs ->> donation.category::text AS category_need
      FROM donations AS donation
      JOIN ngos AS ngo
        ON ngo.active
       AND ST_DWithin(
         ngo.location,
         donation.pickup_location,
         ngo.service_radius_km * 1000
       )
      WHERE donation.id = $1
      ORDER BY ST_Distance(ngo.location, donation.pickup_location), ngo.id
    `,
    [donation.id],
  );
  const candidates = rankCandidates(donation, candidateResult.rows);

  const runResult = await transaction.query<{ id: string }>(
    `
      INSERT INTO matching_runs (donation_id, correlation_id)
      VALUES ($1, $2)
      RETURNING id
    `,
    [donation.id, message.correlationId],
  );
  const matchingRunId = runResult.rows[0]!.id;

  for (const [index, candidate] of candidates.entries()) {
    await transaction.query(
      `
        INSERT INTO matching_candidates (
          matching_run_id,
          ngo_id,
          rank,
          eligible,
          score,
          score_breakdown,
          rejection_reasons
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::text[])
      `,
      [
        matchingRunId,
        candidate.ngoId,
        index + 1,
        candidate.score.eligible,
        candidate.score.total,
        JSON.stringify(candidate.score),
        candidate.score.rejectionReasons,
      ],
    );
  }

  const selected = candidates.find((candidate) => candidate.score.eligible);
  if (!selected) {
    await finishWithoutDestination(
      transaction,
      donation,
      message,
      matchingRunId,
      "no_eligible_ngo",
    );
    return;
  }

  const selectedRank =
    candidates.findIndex((candidate) => candidate.ngoId === selected.ngoId) + 1;
  await transaction.query(
    `
      UPDATE matching_runs
      SET selected_ngo_id = $2
      WHERE id = $1
    `,
    [matchingRunId, selected.ngoId],
  );
  const offerResult = await transaction.query<{
    id: string;
    expires_at: Date;
  }>(
    `
      INSERT INTO offers (
        donation_id,
        ngo_id,
        matching_run_id,
        rank,
        score,
        score_breakdown,
        expires_at,
        correlation_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb,
        now() + ($7 * interval '1 second'), $8
      )
      RETURNING id, expires_at
    `,
    [
      donation.id,
      selected.ngoId,
      matchingRunId,
      selectedRank,
      selected.score.total,
      JSON.stringify(selected.score),
      offerTimeoutSeconds,
      message.correlationId,
    ],
  );
  const offer = offerResult.rows[0]!;
  const offerPayload = {
    offerId: offer.id,
    ngoId: selected.ngoId,
    matchingRunId,
    rank: selectedRank,
    score: selected.score,
  };

  await transaction.query(
    `
      SELECT transition_donation(
        $1, 'classified', 'offered', 'offer.sent', $2,
        $3::jsonb, 'offer.sent'
      )
    `,
    [donation.id, message.correlationId, JSON.stringify(offerPayload)],
  );
  await transaction.query(
    `
      INSERT INTO jobs (
        topic,
        event_type,
        aggregate_id,
        correlation_id,
        causation_id,
        payload,
        run_at
      ) VALUES (
        'offer.timeout', 'offer.timeout', $1, $2, $3, $4::jsonb, $5
      )
    `,
    [
      donation.id,
      message.correlationId,
      offer.id,
      JSON.stringify({ offerId: offer.id }),
      offer.expires_at,
    ],
  );
}

export const matchingInternals = { rankCandidates };
