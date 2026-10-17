import {
  offerDecisionRequestSchema,
  offerStatusSchema,
  paginationQuerySchema,
  uuidSchema,
} from "@resgata/shared";
import { randomUUID } from "node:crypto";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import {
  idempotencyKeyFrom,
  json,
  parseOptionalJson,
  pathUuid,
  type ApiHandler,
} from "../http.js";
import { idempotentTransaction } from "../idempotency.js";
import { mapDonation, mapOffer } from "../mappers.js";
import { decodeCursor, pageFrom } from "../pagination.js";

export const listOffers: ApiHandler = async (request) => {
  const query = paginationQuerySchema.parse({
    cursor: request.query.get("cursor") ?? undefined,
    limit: request.query.get("limit") ?? undefined,
  });
  const statusValue = request.query.get("status");
  const status = statusValue ? offerStatusSchema.parse(statusValue) : undefined;
  const cursor = decodeCursor(query.cursor);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["ngo"]);
    const ngoIdValue = request.query.get("ngoId");
    const ngoId = ngoIdValue ? uuidSchema.parse(ngoIdValue) : actor.profileId;
    if (ngoId !== actor.profileId) {
      throw new ApiError(
        403,
        "forbidden",
        "A ONG solicitada não corresponde ao perfil selecionado.",
      );
    }
    const values: unknown[] = [ngoId];
    const filters = ["offer.ngo_id = $1"];
    if (status) {
      values.push(status);
      filters.push(`offer.status = $${values.length}`);
    }
    if (cursor) {
      values.push(cursor.createdAt, cursor.id);
      filters.push(
        `(offer.created_at, offer.id) < ($${values.length - 1}, $${values.length})`,
      );
    }
    values.push(query.limit + 1);
    const result = await client.query(
      `SELECT offer.*
       FROM offers AS offer
       WHERE ${filters.join(" AND ")}
       ORDER BY offer.created_at DESC, offer.id DESC
       LIMIT $${values.length}`,
      values,
    );
    // NGOs decide from the donation itself: photo, analysis, amounts.
    const donationIds = [...new Set(result.rows.map((row) => row.donation_id))];
    const donations = donationIds.length
      ? await client.query("SELECT * FROM donations WHERE id = ANY($1::uuid[])", [
          donationIds,
        ])
      : { rows: [] };
    const donationById = new Map(
      donations.rows.map((row) => [row.id as string, mapDonation(row)]),
    );
    return json(
      200,
      pageFrom(
        result.rows.map((row) => ({
          ...mapOffer(row),
          donation: donationById.get(row.donation_id),
        })),
        query.limit,
      ),
    );
  } finally {
    client.release();
  }
};

// Amount of a request a donation covers when units are directly comparable.
export function comparableCoverage(
  donation: { quantity: number; unit: string; weightKg: number },
  need: { remaining: number; unit: string },
): number | null {
  if (need.unit === donation.unit) return Math.min(donation.quantity, need.remaining);
  if (need.unit === "kg") return Math.min(donation.weightKg, need.remaining);
  return null;
}

// Below this fit a donation is a substitute: it is welcome, but the NGO still
// needs the requested item, so the request stays open.
export const REQUEST_FILL_MIN_FIT = 0.7;

// An accepted donation fills the request the matcher picked (or the earliest
// comparable one in the category) and uses part of today's capacity.
async function reserveNgoCapacity(
  client: import("pg").PoolClient,
  offerId: string,
  donationId: string,
  ngoId: string,
): Promise<void> {
  const donation = await client.query<{
    category: string | null;
    quantity: number;
    unit: string;
    weight: number;
    need_match: { needId?: string; coveredQuantity?: number | null; fit?: number } | null;
  }>(
    `SELECT donation.category::text AS category,
            donation.quantity::float8 AS quantity,
            donation.unit::text AS unit,
            donation.estimated_weight_kg::float8 AS weight,
            offer.score_breakdown -> 'needMatch' AS need_match
     FROM donations AS donation
     JOIN offers AS offer ON offer.id = $2
     WHERE donation.id = $1`,
    [donationId, offerId],
  );
  const row = donation.rows[0];
  if (!row) return;
  await client.query(
    `UPDATE ngos
     SET current_load_kg = least(capacity_kg, current_load_kg + $2)
     WHERE id = $1`,
    [ngoId, row.weight],
  );

  if (row.need_match?.needId && (row.need_match.fit ?? 0) < REQUEST_FILL_MIN_FIT) return;
  const needs = await client.query<{ id: string; remaining: number; unit: string }>(
    `SELECT id, remaining_quantity::float8 AS remaining, unit::text AS unit
     FROM ngo_needs
     WHERE ngo_id = $1 AND status = 'open'
       AND (id = $2::uuid OR ($2::uuid IS NULL AND category::text = $3))
     ORDER BY needed_by, id
     LIMIT 1
     FOR UPDATE`,
    [ngoId, row.need_match?.needId ?? null, row.category],
  );
  const need = needs.rows[0];
  if (!need) return;
  const estimated = row.need_match?.needId === need.id ? row.need_match.coveredQuantity : null;
  const covered = Math.min(
    need.remaining,
    estimated ?? comparableCoverage({ quantity: row.quantity, unit: row.unit, weightKg: row.weight }, need) ?? 0,
  );
  if (covered <= 0) return;
  await client.query(
    `UPDATE ngo_needs
     SET remaining_quantity = greatest(0, remaining_quantity - $2),
         status = CASE WHEN remaining_quantity - $2 <= 0 THEN 'fulfilled'::ngo_need_status ELSE status END,
         updated_at = now()
     WHERE id = $1`,
    [need.id, covered],
  );
}

const NOTIFIED_DRIVERS = 3;

// Tells the seller who is coming and alerts the nearest available drivers
// whose vehicle can carry the load. Notifications are sent by the workers.
async function notifyAcceptance(
  client: import("pg").PoolClient,
  donationId: string,
  correlationId: string,
): Promise<void> {
  const details = await client.query<{
    description: string;
    weight: number;
    ngo_name: string;
    seller_user_id: string;
    seller_phone: string;
  }>(
    `SELECT donation.description,
            donation.estimated_weight_kg::float8 AS weight,
            ngo.name AS ngo_name,
            seller_user.id AS seller_user_id,
            seller_user.phone AS seller_phone
     FROM pickups AS pickup
     JOIN donations AS donation ON donation.id = pickup.donation_id
     JOIN ngos AS ngo ON ngo.id = pickup.ngo_id
     JOIN sellers AS seller ON seller.id = donation.seller_id
     JOIN users AS seller_user ON seller_user.id = seller.user_id
     WHERE pickup.donation_id = $1`,
    [donationId],
  );
  const row = details.rows[0];
  if (!row) return;
  await client.query(
    `INSERT INTO notifications (user_id, channel, recipient, template, payload, correlation_id)
     VALUES ($1, 'whatsapp', $2, 'offer.accepted', $3::jsonb, $4)`,
    [
      row.seller_user_id,
      row.seller_phone,
      JSON.stringify({
        message: `${row.ngo_name} aceitou sua doação "${row.description}". Um motorista vai buscar em breve.`,
        donationId,
      }),
      correlationId,
    ],
  );
  await client.query(
    `INSERT INTO notifications (user_id, channel, recipient, template, payload, correlation_id)
     SELECT driver_user.id, 'whatsapp', driver_user.phone, 'pickup.available',
            jsonb_build_object(
              'message',
              format(
                'Nova coleta perto de você: %s (%s kg), a %s km. Abra o Resgata para aceitar.',
                $2::text, $3::text,
                round((ST_Distance(driver.current_location, pickup.pickup_location) / 1000.0)::numeric, 1)
              ),
              'donationId', $6::text
            ),
            $4
     FROM pickups AS pickup
     JOIN drivers AS driver
       ON driver.active AND driver.capacity_kg >= $5
     JOIN users AS driver_user ON driver_user.id = driver.user_id
     WHERE pickup.donation_id = $1::uuid
     ORDER BY ST_Distance(driver.current_location, pickup.pickup_location)
     LIMIT ${NOTIFIED_DRIVERS}`,
    [donationId, row.description, row.weight, correlationId, row.weight, donationId],
  );
}

export const acceptOffer: ApiHandler = async (request) => {
  const offerId = pathUuid(request, "offerId");
  const body = await parseOptionalJson(request, offerDecisionRequestSchema, {});
  const key = idempotencyKeyFrom(request);
  const correlationId =
    body.correlationId ??
    request.headers.get("x-correlation-id") ??
    randomUUID();
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["ngo"]);
  } finally {
    authClient.release();
  }

  const result = await idempotentTransaction(
    "offers.accept",
    key,
    actor,
    { offerId, body },
    async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM offers WHERE id = $1 AND ngo_id = $2`,
        [offerId, actor.profileId],
      );
      if (!owned.rowCount) {
        throw new ApiError(404, "not_found", "Oferta não encontrada.");
      }
      const accepted = await client.query(
        "SELECT * FROM accept_offer($1, $2)",
        [offerId, correlationId],
      );
      const offer = mapOffer(accepted.rows[0]);
      await client.query(
        `INSERT INTO pickups (
           donation_id,
           ngo_id,
           pickup_code,
           delivery_code,
           pickup_location,
           delivery_location,
           delivery_due_at
         )
         SELECT
           donation.id,
           $2,
           lpad((floor(random() * 1000000))::integer::text, 6, '0'),
           lpad((floor(random() * 1000000))::integer::text, 6, '0'),
           donation.pickup_location,
           ngo.location,
           donation.expires_at
         FROM donations AS donation
         JOIN ngos AS ngo ON ngo.id = $2
         WHERE donation.id = $1
         ON CONFLICT (donation_id) DO NOTHING`,
        [offer.donationId, actor.profileId],
      );
      await reserveNgoCapacity(client, offerId, offer.donationId, actor.profileId);
      await notifyAcceptance(client, offer.donationId, correlationId);
      return {
        status: 200,
        body: { offer, accepted: true, donationStatus: "accepted" },
        resourceId: offer.id,
      };
    },
  );
  return json(result.status, result.body, correlationId);
};

export const declineOffer: ApiHandler = async (request) => {
  const offerId = pathUuid(request, "offerId");
  const body = await parseOptionalJson(request, offerDecisionRequestSchema, {});
  const key = idempotencyKeyFrom(request);
  const correlationId =
    body.correlationId ??
    request.headers.get("x-correlation-id") ??
    randomUUID();
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["ngo"]);
  } finally {
    authClient.release();
  }

  const result = await idempotentTransaction(
    "offers.decline",
    key,
    actor,
    { offerId, body },
    async (client) => {
      const declined = await client.query(
        `UPDATE offers
         SET status = 'declined', correlation_id = $3
         WHERE id = $1 AND ngo_id = $2 AND status = 'pending'
         RETURNING *`,
        [offerId, actor.profileId, correlationId],
      );
      const row = declined.rows[0];
      if (!row) {
        const exists = await client.query(
          "SELECT 1 FROM offers WHERE id = $1 AND ngo_id = $2",
          [offerId, actor.profileId],
        );
        if (!exists.rowCount) {
          throw new ApiError(404, "not_found", "Oferta não encontrada.");
        }
        throw new ApiError(409, "state_conflict", "A oferta não está pendente.");
      }
      const offer = mapOffer(row);
      const event = await client.query<{ id: string }>(
        `INSERT INTO events (
           donation_id, from_status, to_status, event_type, correlation_id, payload
         ) VALUES (
           $1, 'offered', 'offered', 'offer.declined', $2, $3::jsonb
         ) RETURNING id`,
        [
          offer.donationId,
          correlationId,
          JSON.stringify({ offerId, reason: body.reason ?? null }),
        ],
      );
      await client.query(
        `INSERT INTO outbox (
           topic, event_type, aggregate_id, correlation_id, causation_id, payload
         ) VALUES (
           'offer.timeout', 'offer.declined', $1, $2, $3, $4::jsonb
         )`,
        [
          offer.donationId,
          correlationId,
          event.rows[0]?.id,
          JSON.stringify({ offerId, reason: body.reason ?? null }),
        ],
      );
      return {
        status: 200,
        body: { offer, accepted: false, donationStatus: "offered" },
        resourceId: offer.id,
      };
    },
  );
  return json(result.status, result.body, correlationId);
};
