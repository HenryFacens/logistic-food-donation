import { ngoMatchingFeedSchema } from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { json, type ApiHandler } from "../http.js";

type FeedRow = {
  donation_id: string;
  description: string;
  seller_name: string;
  estimated_weight_kg: string;
  image_url: string | null;
  run_at: Date;
  rank: number;
  candidates: number;
  eligible: boolean;
  score: string;
  score_breakdown: {
    components: { distance: { raw: number }; perishability: { raw: number } };
    needMatch?: unknown;
  };
  rejection_reasons: string[];
  winner_name: string | null;
  winner_score: string | null;
  offer_status: string | null;
};

/**
 * The NGO's view of matching: for each recent donation where it was a
 * candidate, its rank, score, matched request, and who got the offer.
 */
export const getNgoMatchingFeed: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["ngo"]);
    const result = await client.query<FeedRow>(
      `SELECT DISTINCT ON (run.donation_id)
              run.donation_id,
              donation.description,
              regexp_replace(seller.legal_name, '\\s+SIMULADO$', '') AS seller_name,
              donation.estimated_weight_kg,
              donation.image_url,
              run.created_at AS run_at,
              mine.rank,
              (SELECT count(*)::int FROM matching_candidates AS other
               WHERE other.matching_run_id = run.id) AS candidates,
              mine.eligible,
              mine.score,
              mine.score_breakdown,
              mine.rejection_reasons,
              CASE WHEN mine.rank = 1 THEN NULL
                   ELSE regexp_replace(winner_ngo.name, '\\s+SIMULADO$', '') END AS winner_name,
              CASE WHEN mine.rank = 1 THEN NULL ELSE winner.score END AS winner_score,
              offer.status::text AS offer_status
       FROM matching_runs AS run
       JOIN matching_candidates AS mine
         ON mine.matching_run_id = run.id AND mine.ngo_id = $1
       JOIN donations AS donation ON donation.id = run.donation_id
       JOIN sellers AS seller ON seller.id = donation.seller_id
       LEFT JOIN matching_candidates AS winner
         ON winner.matching_run_id = run.id AND winner.rank = 1
       LEFT JOIN ngos AS winner_ngo ON winner_ngo.id = winner.ngo_id
       LEFT JOIN LATERAL (
         SELECT status FROM offers
         WHERE offers.donation_id = run.donation_id AND offers.ngo_id = $1
         ORDER BY created_at DESC
         LIMIT 1
       ) AS offer ON true
       ORDER BY run.donation_id, run.created_at DESC`,
      [actor.profileId],
    );
    // Runs with a single candidate say nothing about the comparison.
    const items = result.rows
      .filter((row) => row.candidates > 1)
      .sort((left, right) => right.run_at.getTime() - left.run_at.getTime())
      .slice(0, 12)
      .map((row) => ({
        donationId: row.donation_id,
        description: row.description.replace(/^SIMULADO\s*[-–]\s*/u, ""),
        sellerName: row.seller_name,
        weightKg: Number(row.estimated_weight_kg),
        imageUrl: row.image_url,
        runAt: row.run_at.toISOString(),
        rank: row.rank,
        candidates: row.candidates,
        eligible: row.eligible,
        score: Number(row.score),
        distanceKm: Math.round(row.score_breakdown.components.distance.raw * 10) / 10,
        etaMinutes: Math.round(row.score_breakdown.components.perishability.raw),
        rejectionReasons: row.rejection_reasons,
        needMatch: row.score_breakdown.needMatch,
        winnerName: row.winner_name,
        winnerScore: row.winner_score === null ? null : Number(row.winner_score),
        offerStatus: row.offer_status,
      }));
    return json(200, ngoMatchingFeedSchema.parse({ items }));
  } finally {
    client.release();
  }
};
