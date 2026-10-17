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
      // Last, after every reseed: demo data is presented as real.
      await client.query(`SELECT present_demo_as_real()`);
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
