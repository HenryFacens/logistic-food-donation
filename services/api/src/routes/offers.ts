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
import { mapOffer } from "../mappers.js";
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
    return json(200, pageFrom(result.rows.map(mapOffer), query.limit));
  } finally {
    client.release();
  }
};

// An accepted donation fills the NGO's matching open needs (earliest deadline
// first) and uses up part of today's receiving capacity.
async function reserveNgoCapacity(
  client: import("pg").PoolClient,
  donationId: string,
  ngoId: string,
): Promise<void> {
  const donation = await client.query<{ category: string | null; weight: string }>(
    "SELECT category::text AS category, estimated_weight_kg AS weight FROM donations WHERE id = $1",
    [donationId],
  );
  const row = donation.rows[0];
  if (!row) return;
  let remaining = Number(row.weight);
  await client.query(
    `UPDATE ngos
     SET current_load_kg = least(capacity_kg, current_load_kg + $2)
     WHERE id = $1`,
    [ngoId, remaining],
  );
  if (!row.category) return;
  const needs = await client.query<{ id: string; remaining_kg: string }>(
    `SELECT id, remaining_kg FROM ngo_needs
     WHERE ngo_id = $1 AND category = $2::donation_category AND status = 'open'
     ORDER BY needed_by, id
     FOR UPDATE`,
    [ngoId, row.category],
  );
  for (const need of needs.rows) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, Number(need.remaining_kg));
    remaining -= used;
    await client.query(
      `UPDATE ngo_needs
       SET remaining_kg = remaining_kg - $2,
           status = CASE WHEN remaining_kg - $2 <= 0 THEN 'fulfilled'::ngo_need_status ELSE status END,
           updated_at = now()
       WHERE id = $1`,
      [need.id, used],
    );
  }
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
           delivery_location
         )
         SELECT
           donation.id,
           $2,
           lpad((floor(random() * 1000000))::integer::text, 6, '0'),
           lpad((floor(random() * 1000000))::integer::text, 6, '0'),
           donation.pickup_location,
           ngo.location
         FROM donations AS donation
         JOIN ngos AS ngo ON ngo.id = $2
         WHERE donation.id = $1
         ON CONFLICT (donation_id) DO NOTHING`,
        [offer.donationId, actor.profileId],
      );
      await reserveNgoCapacity(client, offer.donationId, actor.profileId);
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
