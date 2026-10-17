import type { MessageEnvelope } from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type { SqlExecutor } from "../infrastructure/database.js";

interface OfferRow extends QueryResultRow {
  id: string;
  donation_id: string;
  matching_run_id: string;
  status: "pending" | "declined" | "accepted" | "timed_out" | "cancelled";
  expires_at: Date;
}

interface DonationRow extends QueryResultRow {
  id: string;
  status: string;
  expires_at: Date;
}

interface CandidateRow extends QueryResultRow {
  ngo_id: string;
  rank: number;
  score: string;
  score_breakdown: Record<string, unknown>;
}

function payloadOfferId(message: MessageEnvelope): string {
  const value = message.payload.offerId;
  if (typeof value !== "string") {
    throw new Error("offer.timeout payload requires offerId");
  }
  return value;
}

async function scheduleTimeout(
  transaction: SqlExecutor,
  offer: { id: string; donationId: string; expiresAt: Date },
  message: MessageEnvelope,
): Promise<void> {
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
      offer.donationId,
      message.correlationId,
      offer.id,
      JSON.stringify({ offerId: offer.id }),
      offer.expiresAt,
    ],
  );
}

export async function handleOfferTimeout(
  message: MessageEnvelope,
  transaction: SqlExecutor,
  offerTimeoutSeconds: number,
): Promise<void> {
  const offerResult = await transaction.query<OfferRow>(
    `
      SELECT id, donation_id, matching_run_id, status, expires_at
      FROM offers
      WHERE id = $1
      FOR UPDATE
    `,
    [payloadOfferId(message)],
  );
  const offer = offerResult.rows[0];
  if (!offer || !["pending", "declined"].includes(offer.status)) {
    return;
  }

  const donationResult = await transaction.query<DonationRow>(
    `
      SELECT id, status, expires_at
      FROM donations
      WHERE id = $1
      FOR UPDATE
    `,
    [offer.donation_id],
  );
  const donation = donationResult.rows[0];
  if (!donation || donation.status !== "offered") {
    return;
  }

  const now = new Date();
  if (offer.status === "pending" && offer.expires_at > now) {
    await scheduleTimeout(
      transaction,
      {
        id: offer.id,
        donationId: offer.donation_id,
        expiresAt: offer.expires_at,
      },
      message,
    );
    return;
  }

  if (offer.status === "pending") {
    await transaction.query(
      `
        UPDATE offers
        SET status = 'timed_out'
        WHERE id = $1
          AND status = 'pending'
      `,
      [offer.id],
    );
  }

  if (donation.expires_at <= now) {
    await transaction.query(
      `
        SELECT transition_donation(
          $1, 'offered', 'expired', 'donation.expired', $2,
          $3::jsonb, NULL
        )
      `,
      [
        donation.id,
        message.correlationId,
        JSON.stringify({ offerId: offer.id, reason: "donation_expired" }),
      ],
    );
    return;
  }

  const nextResult = await transaction.query<CandidateRow>(
    `
      SELECT
        candidate.ngo_id,
        candidate.rank,
        candidate.score,
        candidate.score_breakdown
      FROM matching_candidates AS candidate
      WHERE candidate.matching_run_id = $1
        AND candidate.eligible
        AND NOT EXISTS (
          SELECT 1
          FROM offers AS existing_offer
          WHERE existing_offer.donation_id = $2
            AND existing_offer.ngo_id = candidate.ngo_id
        )
      ORDER BY candidate.rank
      LIMIT 1
    `,
    [offer.matching_run_id, donation.id],
  );
  const next = nextResult.rows[0];
  if (next) {
    const nextOfferResult = await transaction.query<{
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
        next.ngo_id,
        offer.matching_run_id,
        next.rank,
        next.score,
        JSON.stringify(next.score_breakdown),
        offerTimeoutSeconds,
        message.correlationId,
      ],
    );
    const nextOffer = nextOfferResult.rows[0]!;
    const payload = {
      offerId: nextOffer.id,
      previousOfferId: offer.id,
      ngoId: next.ngo_id,
      rank: next.rank,
      score: next.score_breakdown,
    };
    await transaction.query(
      `
        UPDATE matching_runs
        SET selected_ngo_id = $2
        WHERE id = $1
      `,
      [offer.matching_run_id, next.ngo_id],
    );
    await transaction.query(
      `
        INSERT INTO events (
          donation_id,
          from_status,
          to_status,
          event_type,
          correlation_id,
          payload
        ) VALUES ($1, 'offered', 'offered', 'offer.sent', $2, $3::jsonb)
      `,
      [donation.id, message.correlationId, JSON.stringify(payload)],
    );
    await transaction.query(
      `
        INSERT INTO outbox (
          topic,
          event_type,
          aggregate_id,
          correlation_id,
          causation_id,
          payload
        ) VALUES ('offer.sent', 'offer.sent', $1, $2, $3, $4::jsonb)
      `,
      [
        donation.id,
        message.correlationId,
        nextOffer.id,
        JSON.stringify(payload),
      ],
    );
    await scheduleTimeout(
      transaction,
      {
        id: nextOffer.id,
        donationId: donation.id,
        expiresAt: nextOffer.expires_at,
      },
      message,
    );
    return;
  }

  await transaction.query(
    `
      UPDATE matching_runs
      SET fallback_stage = 'no_destination',
          selected_ngo_id = NULL
      WHERE id = $1
    `,
    [offer.matching_run_id],
  );
  await transaction.query(
    `
      INSERT INTO freight_requests (
        donation_id,
        status,
        provider_name,
        simulated,
        simulation_label
      ) VALUES ($1, 'unavailable', 'Frete parceiro', true, 'SIMULADO')
      ON CONFLICT (donation_id) DO UPDATE
      SET status = 'unavailable',
          updated_at = now()
    `,
    [donation.id],
  );
  await transaction.query(
    `
      SELECT transition_donation(
        $1, 'offered', 'no_destination', 'donation.no_destination', $2,
        $3::jsonb, NULL
      )
    `,
    [
      donation.id,
      message.correlationId,
      JSON.stringify({
        exhaustedOfferId: offer.id,
        fallback: "paid_freight_unavailable",
        simulated: true,
        simulationLabel: "SIMULADO",
      }),
    ],
  );
}
