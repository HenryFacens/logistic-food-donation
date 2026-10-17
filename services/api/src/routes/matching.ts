import { matchingExplanationSchema } from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { json, pathUuid, type ApiHandler } from "../http.js";
import { donationVisibility } from "../visibility.js";

type CandidateRow = {
  ngo_id: string;
  ngo_name: string;
  rank: number;
  eligible: boolean;
  score: string;
  score_breakdown: {
    components: {
      distance: { raw: number };
      perishability: { raw: number };
      categoryNeed: { raw: number };
    };
    needMatch?: unknown;
  };
  rejection_reasons: string[];
  offer_status: string | null;
};

/** Ranked candidates of the latest matching run, for "why this NGO?". */
export const getDonationMatching: ApiHandler = async (request) => {
  const donationId = pathUuid(request, "donationId");
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request);
    const visibility = donationVisibility(actor);
    const visible = await client.query(
      `SELECT 1 FROM donations AS donation
       WHERE donation.id = $2 AND ${visibility.sql}`,
      [...visibility.params, donationId],
    );
    if (!visible.rowCount) {
      throw new ApiError(404, "not_found", "Doação não encontrada.");
    }

    const run = await client.query<{ id: string; created_at: Date }>(
      `SELECT id, created_at FROM matching_runs
       WHERE donation_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [donationId],
    );
    const runRow = run.rows[0];
    const candidates = runRow
      ? await client.query<CandidateRow>(
          `SELECT candidate.ngo_id,
                  regexp_replace(ngo.name, '\\s+SIMULADO$', '') AS ngo_name,
                  candidate.rank,
                  candidate.eligible,
                  candidate.score,
                  candidate.score_breakdown,
                  candidate.rejection_reasons,
                  offer.status::text AS offer_status
           FROM matching_candidates AS candidate
           JOIN ngos AS ngo ON ngo.id = candidate.ngo_id
           LEFT JOIN LATERAL (
             SELECT status FROM offers
             WHERE donation_id = $2 AND ngo_id = candidate.ngo_id
             ORDER BY created_at DESC
             LIMIT 1
           ) AS offer ON true
           WHERE candidate.matching_run_id = $1
           ORDER BY candidate.rank`,
          [runRow.id, donationId],
        )
      : { rows: [] };

    const outOfRange = await client.query<{
      ngo_name: string;
      distance_km: number;
      service_radius_km: number;
    }>(
      `SELECT regexp_replace(ngo.name, '\\s+SIMULADO$', '') AS ngo_name,
              ST_Distance(ngo.location, donation.pickup_location) / 1000.0 AS distance_km,
              ngo.service_radius_km::float8 AS service_radius_km
       FROM donations AS donation
       JOIN ngos AS ngo ON ngo.active
       WHERE donation.id = $1
         AND NOT ST_DWithin(ngo.location, donation.pickup_location, ngo.service_radius_km * 1000)
       ORDER BY distance_km`,
      [donationId],
    );

    const round1 = (value: number) => Math.round(value * 10) / 10;
    return json(
      200,
      matchingExplanationSchema.parse({
        donationId,
        runAt: runRow ? runRow.created_at.toISOString() : null,
        candidates: candidates.rows.map((row) => ({
          ngoId: row.ngo_id,
          ngoName: row.ngo_name,
          rank: row.rank,
          eligible: row.eligible,
          score: Number(row.score),
          distanceKm: round1(row.score_breakdown.components.distance.raw),
          etaMinutes: Math.round(row.score_breakdown.components.perishability.raw),
          needScore: row.score_breakdown.components.categoryNeed.raw,
          rejectionReasons: row.rejection_reasons,
          offerStatus: row.offer_status,
          needMatch: row.score_breakdown.needMatch,
        })),
        outOfRange: outOfRange.rows.map((row) => ({
          ngoName: row.ngo_name,
          distanceKm: round1(Number(row.distance_km)),
          serviceRadiusKm: row.service_radius_km,
        })),
      }),
    );
  } finally {
    client.release();
  }
};
