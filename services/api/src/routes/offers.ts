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
