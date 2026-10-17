import { randomUUID } from "node:crypto";
import { requireActor } from "../auth.js";
import { getConfig } from "../config.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import {
  idempotencyKeyFrom,
  json,
  type ApiHandler,
} from "../http.js";
import { idempotentTransaction } from "../idempotency.js";

/**
 * Fresh donations posted through the normal pipeline (donation, event, outbox)
 * so the workers and Claude rank them live after every reset: NGOs open the
 * app to real pending offers with real scores.
 */
const LIVE_DONATIONS = [
  {
    sellerId: "21000000-0000-4000-8000-000000000001",
    category: "bakery",
    description: "Pães franceses do dia",
    items: ["Pão francês"],
    quantity: 40,
    unit: "unit",
    weightKg: 2.4,
    shelfLifeMinutes: 480,
    pickupWithinMinutes: 180,
  },
  {
    sellerId: "21000000-0000-4000-8000-000000000002",
    category: "produce",
    description: "Cenouras, batatas e abóbora para sopa",
    items: ["Cenoura", "Batata", "Abóbora"],
    quantity: 14,
    unit: "kg",
    weightKg: 14,
    shelfLifeMinutes: 2880,
    pickupWithinMinutes: 240,
  },
  {
    sellerId: "21000000-0000-4000-8000-000000000003",
    category: "dairy",
    description: "Iogurtes naturais na validade",
    items: ["Iogurte natural"],
    quantity: 30,
    unit: "unit",
    weightKg: 4.5,
    shelfLifeMinutes: 720,
    pickupWithinMinutes: 180,
  },
] as const;

async function postLiveDonations(
  client: import("pg").PoolClient,
  correlationId: string,
) {
  for (const donation of LIVE_DONATIONS) {
    const classification = {
      category: donation.category,
      description: donation.description,
      confidence: 0.9,
      perishabilityMinutes: donation.shelfLifeMinutes,
      source: "manual",
      simulated: false,
      isFood: true,
      items: donation.items,
      suggestedQuantity: donation.quantity,
      suggestedUnit: donation.unit,
      estimatedWeightKg: donation.weightKg,
      condition: "good",
    };
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO donations (
         seller_id, status, category, description, quantity, unit,
         estimated_weight_kg, perishability_minutes, pickup_address,
         pickup_location, available_from, expires_at, classification,
         classification_confidence, correlation_id, idempotency_key
       )
       SELECT seller.id, 'posted', $2::donation_category, $3, $4, $5::donation_unit,
              $6, $7, seller.address, seller.location, now(),
              now() + $8 * interval '1 minute', $9::jsonb, 0.9, $10,
              'reset-live-' || gen_random_uuid()
       FROM sellers AS seller
       WHERE seller.id = $1
       RETURNING id`,
      [
        donation.sellerId,
        donation.category,
        donation.description,
        donation.quantity,
        donation.unit,
        donation.weightKg,
        donation.shelfLifeMinutes,
        donation.pickupWithinMinutes,
        JSON.stringify(classification),
        correlationId,
      ],
    );
    const donationId = inserted.rows[0]?.id;
    if (!donationId) continue;
    const event = await client.query<{ id: string }>(
      `INSERT INTO events (
         donation_id, from_status, to_status, event_type, correlation_id, payload
       ) VALUES ($1, NULL, 'posted', 'donation.created', $2, $3::jsonb)
       RETURNING id`,
      [donationId, correlationId, JSON.stringify({ sellerId: donation.sellerId })],
    );
    await client.query(
      `INSERT INTO outbox (
         topic, event_type, aggregate_id, correlation_id, causation_id, payload
       ) VALUES ('donation.created', 'donation.created', $1, $2, $3, $4::jsonb)`,
      [donationId, correlationId, event.rows[0]?.id, JSON.stringify({ donationId })],
    );
  }
}

export const resetDemo: ApiHandler = async (request) => {
  if (!getConfig().ENABLE_DEV_RESET) {
    throw new ApiError(404, "not_found", "Rota de reset desabilitada.");
  }
  const key = idempotencyKeyFrom(request);
  const correlationId =
    request.headers.get("x-correlation-id") ?? randomUUID();
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["platform"]);
  } finally {
    authClient.release();
  }

  const result = await idempotentTransaction(
    "dev.reset",
    key,
    actor,
    {},
    async (client) => {
      await client.query(
        `DELETE FROM driver_ratings
         WHERE NOT (
           simulated
           AND (
             id::text LIKE '39000000-0000-4000-8000-%'
             OR id::text LIKE '39100000-0000-4000-8000-%'
           )
         )`,
      );
      await client.query(
        `DELETE FROM delivery_receipts
         WHERE NOT (
           simulated
           AND id::text LIKE '38000000-0000-4000-8000-%'
         )`,
      );
      await client.query(
        `DELETE FROM pickups
         WHERE donation_id NOT IN (
           SELECT id FROM donations
           WHERE id::text LIKE '30000000-0000-4000-8000-%'
         )`,
      );
      await client.query(
        `DELETE FROM partner_sponsorships
         WHERE donation_id NOT IN (
           SELECT id FROM donations
           WHERE id::text LIKE '30000000-0000-4000-8000-%'
         )`,
      );
      await client.query(
        `DELETE FROM donations
         WHERE id::text NOT LIKE '30000000-0000-4000-8000-%'`,
      );
      for (const table of [
        "redemptions",
        "notifications",
        "outbox",
        "jobs",
        "processed_messages",
        "dead_letter_messages",
      ]) {
        await client.query(`DELETE FROM ${table}`);
      }
      await client.query(
        `DELETE FROM idempotency_keys
         WHERE NOT (scope = 'dev.reset' AND idempotency_key = $1)`,
        [key],
      );
      await client.query(
        `UPDATE drivers AS driver
         SET points = seed.points
         FROM (
           VALUES
             ('23000000-0000-4000-8000-000000000001'::uuid, 420),
             ('23000000-0000-4000-8000-000000000002'::uuid, 310),
             ('23000000-0000-4000-8000-000000000003'::uuid, 275),
             ('23000000-0000-4000-8000-000000000004'::uuid, 190)
         ) AS seed(id, points)
         WHERE driver.id = seed.id`,
      );
      await client.query(
        `UPDATE ngos AS ngo
         SET current_load_kg = seed.current_load_kg
         FROM (
           VALUES
             ('22000000-0000-4000-8000-000000000001'::uuid, 140::numeric),
             ('22000000-0000-4000-8000-000000000002'::uuid, 75::numeric),
             ('22000000-0000-4000-8000-000000000003'::uuid, 190::numeric),
             ('22000000-0000-4000-8000-000000000004'::uuid, 60::numeric),
             ('22000000-0000-4000-8000-000000000005'::uuid, 50::numeric)
         ) AS seed(id, current_load_kg)
         WHERE ngo.id = seed.id`,
      );
      await client.query(
        `SELECT seed_ngo_receiving_hours()`,
      );
      await client.query(`SELECT seed_ngo_categories()`);
      await client.query(`SELECT seed_ngo_needs()`);
      await client.query(
        `UPDATE coupons AS coupon
         SET stock = seed.stock
         FROM (
           VALUES
             ('25000000-0000-4000-8000-000000000001'::uuid, 100),
             ('25000000-0000-4000-8000-000000000002'::uuid, 80),
             ('25000000-0000-4000-8000-000000000003'::uuid, 60),
             ('25000000-0000-4000-8000-000000000004'::uuid, 30),
             ('25000000-0000-4000-8000-000000000005'::uuid, 45),
             ('25000000-0000-4000-8000-000000000006'::uuid, 50),
             ('25000000-0000-4000-8000-000000000007'::uuid, 25),
             ('25000000-0000-4000-8000-000000000008'::uuid, 70)
         ) AS seed(id, stock)
         WHERE coupon.id = seed.id`,
      );
      // Restore the open driver deliveries with fresh, now-relative deadlines.
      // Databases seeded before the function existed skip this step.
      const openPickups = await client.query<{ available: boolean }>(
        "SELECT to_regproc('reset_demo_open_pickups') IS NOT NULL AS available",
      );
      if (openPickups.rows[0]?.available) {
        await client.query("SELECT reset_demo_open_pickups()");
      }
      // São Paulo deliveries for the driver trip demo (BCG → USP at 09:30).
      const tripPickups = await client.query<{ available: boolean }>(
        "SELECT to_regproc('reset_trip_demo_pickups') IS NOT NULL AS available",
      );
      if (tripPickups.rows[0]?.available) {
        await client.query("SELECT reset_trip_demo_pickups()");
      }
      // Last, after every reseed: demo data is presented as real.
      await client.query(`SELECT present_demo_as_real()`);
      await postLiveDonations(client, correlationId);
      return {
        status: 200,
        body: {
          reset: true,
          correlationId,
          simulated: true,
          simulationLabel: "SIMULADO",
        },
      };
    },
  );
  return json(result.status, result.body, correlationId);
};
