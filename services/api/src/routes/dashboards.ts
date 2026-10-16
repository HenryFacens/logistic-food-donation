import { z } from "zod";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { json, pathUuid, type ApiHandler } from "../http.js";

const impactQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});

export const getSellerImpact: ApiHandler = async (request) => {
  const query = impactQuerySchema.parse({
    from: request.query.get("from") ?? undefined,
    to: request.query.get("to") ?? undefined,
  });
  const end = query.to ?? new Date().toISOString();
  const start =
    query.from ??
    new Date(new Date(end).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["seller"]);
    const totals = await client.query<{
      donations: number;
      weight_kg: number;
    }>(
      `SELECT
         count(*)::int AS donations,
         coalesce(sum(estimated_weight_kg), 0)::float8 AS weight_kg
       FROM donations
       WHERE seller_id = $1
         AND created_at >= $2
         AND created_at < $3
         AND status = 'delivered'`,
      [actor.profileId, start, end],
    );
    const byCategory = await client.query(
      `SELECT
         category,
         count(*)::int AS donations,
         coalesce(sum(estimated_weight_kg), 0)::float8 AS "weightKg"
       FROM donations
       WHERE seller_id = $1
         AND created_at >= $2
         AND created_at < $3
         AND status = 'delivered'
         AND category IS NOT NULL
       GROUP BY category
       ORDER BY category`,
      [actor.profileId, start, end],
    );
    const recent = await client.query<{ id: string }>(
      `SELECT id
       FROM donations
       WHERE seller_id = $1 AND created_at >= $2 AND created_at < $3
       ORDER BY created_at DESC
       LIMIT 10`,
      [actor.profileId, start, end],
    );
    const total = totals.rows[0] ?? { donations: 0, weight_kg: 0 };
    const weight = Number(total.weight_kg);
    return json(200, {
      periodStart: start,
      periodEnd: end,
      metrics: [
        {
          key: "donations",
          label: "Doações entregues",
          value: Number(total.donations),
          unit: "doações",
        },
        {
          key: "weight",
          label: "Alimentos destinados",
          value: weight,
          unit: "kg",
        },
        {
          key: "meals",
          label: "Refeições estimadas",
          value: Math.round(weight / 0.5),
          unit: "refeições",
        },
        {
          key: "co2",
          label: "CO₂ evitado estimado",
          value: Math.round(weight * 2.5 * 100) / 100,
          unit: "kg CO₂e",
        },
      ],
      byCategory: byCategory.rows,
      recentDonationIds: recent.rows.map((row) => row.id),
    });
  } finally {
    client.release();
  }
};

export const getSellerForecast: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["seller"]);
    const result = await client.query(
      `SELECT *
       FROM forecast_snapshots
       WHERE seller_id = $1
       ORDER BY generated_at DESC
       LIMIT 1`,
      [actor.profileId],
    );
    const row = result.rows[0];
    return json(200, {
      generatedAt: row?.generated_at
        ? new Date(row.generated_at).toISOString()
        : new Date().toISOString(),
      horizonDays: Number(row?.horizon_days ?? 30),
      expectedDonations: Number(row?.expected_donations ?? 0),
      expectedWeightKg: Number(row?.expected_weight_kg ?? 0),
      methodology:
        row?.methodology ??
        "SIMULADO - histórico insuficiente para projeção.",
      simulated: true,
      simulationLabel: "SIMULADO",
    });
  } finally {
    client.release();
  }
};

export const getPartnerDashboard: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["partner"]);
    const result = await client.query<{
      sponsored_deliveries: number;
      estimated_reach_people: number;
      estimated_cost_brl: number;
      active_coupons: number;
      redemptions: number;
    }>(
      `SELECT
         (
           SELECT count(*)::int
           FROM partner_sponsorships AS sponsorship
           JOIN donations AS donation ON donation.id = sponsorship.donation_id
           WHERE sponsorship.partner_id = $1 AND donation.status = 'delivered'
         ) AS sponsored_deliveries,
         (
           SELECT coalesce(sum(estimated_reach_people), 0)::int
           FROM partner_sponsorships WHERE partner_id = $1
         ) AS estimated_reach_people,
         (
           SELECT coalesce(sum(estimated_cost_brl), 0)::float8
           FROM partner_sponsorships WHERE partner_id = $1
         ) AS estimated_cost_brl,
         (
           SELECT count(*)::int
           FROM coupons
           WHERE partner_id = $1 AND active AND valid_until > now()
         ) AS active_coupons,
         (
           SELECT count(*)::int
           FROM redemptions AS redemption
           JOIN coupons AS coupon ON coupon.id = redemption.coupon_id
           WHERE coupon.partner_id = $1
         ) AS redemptions`,
      [actor.profileId],
    );
    const row = result.rows[0]!;
    const reach = Number(row.estimated_reach_people);
    const cost = Number(row.estimated_cost_brl);
    return json(200, {
      partnerId: actor.profileId,
      sponsoredDeliveries: Number(row.sponsored_deliveries),
      estimatedReachPeople: reach,
      estimatedRoi: cost > 0 ? Math.round((reach / cost) * 100) / 100 : 0,
      activeCoupons: Number(row.active_coupons),
      metrics: [
        {
          key: "redemptions",
          label: "Cupons resgatados",
          value: Number(row.redemptions),
          unit: "resgates",
        },
        {
          key: "investment",
          label: "Investimento estimado",
          value: cost,
          unit: "BRL",
        },
      ],
      simulated: true,
      simulationLabel: "SIMULADO",
    });
  } finally {
    client.release();
  }
};

export const listPartnerRedemptions: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["partner"]);
    const requestedPartnerId = request.params.partnerId
      ? pathUuid(request, "partnerId")
      : actor.profileId;
    if (requestedPartnerId !== actor.profileId) {
      throw new ApiError(404, "not_found", "Parceiro não encontrado.");
    }
    const result = await client.query(
      `SELECT
         redemption.id,
         redemption.coupon_id AS "couponId",
         coupon.title AS "couponTitle",
         redemption.driver_id AS "driverId",
         redemption.redemption_code AS "redemptionCode",
         redemption.status,
         redemption.issued_at AS "issuedAt",
         redemption.used_at AS "usedAt",
         redemption.simulated,
         redemption.simulation_label AS "simulationLabel"
       FROM redemptions AS redemption
       JOIN coupons AS coupon ON coupon.id = redemption.coupon_id
       WHERE coupon.partner_id = $1
       ORDER BY redemption.issued_at DESC
       LIMIT 100`,
      [requestedPartnerId],
    );
    return json(200, { items: result.rows });
  } finally {
    client.release();
  }
};
