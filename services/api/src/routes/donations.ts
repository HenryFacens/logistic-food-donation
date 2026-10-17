import {
  type Classification,
  createDonationRequestSchema,
  donationListQuerySchema,
  uuidSchema,
} from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import {
  idempotencyKeyFrom,
  json,
  parseJson,
  pathUuid,
  type ApiHandler,
} from "../http.js";
import { idempotentTransaction } from "../idempotency.js";
import { mapDonation, mapDonationEvent } from "../mappers.js";
import { decodeCursor, pageFrom } from "../pagination.js";
import { assertPhotoOwner, photoPath } from "../photos.js";
import { donationVisibility } from "../visibility.js";

// Server-side guard: the UI blocks these too, but the API is the authority.
export function assertDonatable(classification?: Classification): void {
  if (classification?.isFood === false) {
    throw new ApiError(
      422,
      "not_food",
      "A foto analisada não mostra alimentos. Envie uma foto do alimento.",
    );
  }
  if (classification?.condition === "unsafe") {
    throw new ApiError(
      422,
      "unsafe_food",
      "A análise indicou que este alimento não está seguro para doação.",
    );
  }
}

// The donor sees who is coming, the NGO, and the pickup code to hand over.
async function sellerPickups(
  client: import("pg").PoolClient,
  actor: { role: string },
  rows: Array<{ id: string }>,
) {
  if (actor.role !== "seller" || !rows.length) return null;
  const result = await client.query<{
    donation_id: string;
    status: string;
    pickup_code: string;
    driver_name: string | null;
    vehicle: string | null;
    ngo_name: string;
    assigned_at: Date | null;
    collected_at: Date | null;
    delivered_at: Date | null;
  }>(
    `SELECT pickup.donation_id, pickup.status::text AS status, pickup.pickup_code,
            driver.name AS driver_name, driver.vehicle, ngo.name AS ngo_name,
            pickup.assigned_at, pickup.collected_at, pickup.delivered_at
     FROM pickups AS pickup
     JOIN ngos AS ngo ON ngo.id = pickup.ngo_id
     LEFT JOIN drivers AS driver ON driver.id = pickup.driver_id
     WHERE pickup.donation_id = ANY($1::uuid[])`,
    [rows.map((row) => row.id)],
  );
  const iso = (value: Date | null) => (value ? value.toISOString() : null);
  return new Map(
    result.rows.map((row) => [
      row.donation_id,
      {
        status: row.status,
        // Only useful until the food is collected.
        pickupCode: row.collected_at ? null : String(row.pickup_code).trim(),
        driverName: row.driver_name,
        vehicle: row.vehicle,
        ngoName: row.ngo_name,
        assignedAt: iso(row.assigned_at),
        collectedAt: iso(row.collected_at),
        deliveredAt: iso(row.delivered_at),
      },
    ]),
  );
}

export const listDonations: ApiHandler = async (request) => {
  const query = donationListQuerySchema.parse({
    status: request.query.get("status") ?? undefined,
    cursor: request.query.get("cursor") ?? undefined,
    limit: request.query.get("limit") ?? undefined,
  });
  const cursor = decodeCursor(query.cursor);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request);
    const visibility = donationVisibility(actor);
    const values: unknown[] = [...visibility.params];
    const filters = [visibility.sql];
    if (query.status) {
      values.push(query.status);
      filters.push(`donation.status = $${values.length}`);
    }
    if (cursor) {
      values.push(cursor.createdAt, cursor.id);
      filters.push(
        `(donation.created_at, donation.id) < ($${values.length - 1}, $${values.length})`,
      );
    }
    values.push(query.limit + 1);
    const result = await client.query(
      `SELECT donation.*
       FROM donations AS donation
       WHERE ${filters.join(" AND ")}
       ORDER BY donation.created_at DESC, donation.id DESC
       LIMIT $${values.length}`,
      values,
    );
    const pickups = await sellerPickups(client, actor, result.rows);
    return json(
      200,
      pageFrom(
        result.rows.map((row) => ({
          ...mapDonation(row),
          ...(pickups ? { pickup: pickups.get(row.id) ?? null } : {}),
        })),
        query.limit,
      ),
    );
  } finally {
    client.release();
  }
};

export const createDonation: ApiHandler = async (request) => {
  const body = await parseJson(request, createDonationRequestSchema);
  if (new Date(body.expiresAt) <= new Date(body.availableFrom)) {
    throw new ApiError(
      422,
      "invalid_availability_window",
      "O vencimento deve ocorrer após o início da disponibilidade.",
    );
  }
  assertDonatable(body.classification);
  const photoId = body.photoId ?? body.classification?.photoId;
  const key = idempotencyKeyFrom(request);
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["seller"]);
  } finally {
    authClient.release();
  }

  const result = await idempotentTransaction(
    "donations.create",
    key,
    actor,
    body,
    async (client) => {
      if (photoId) await assertPhotoOwner(client, photoId, actor.profileId);
      const inserted = await client.query(
        `INSERT INTO donations (
           seller_id,
           status,
           category,
           description,
           quantity,
           unit,
           estimated_weight_kg,
           unit_value_brl,
           disposal_cost_brl,
           perishability_minutes,
           pickup_address,
           pickup_location,
           available_from,
           expires_at,
           image_url,
           photo_id,
           classification,
           classification_confidence,
           correlation_id,
           idempotency_key
         ) VALUES (
           $1,
           'posted',
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           $10::jsonb,
           ST_SetSRID(ST_MakePoint($11, $12), 4326)::geography,
           $13,
           $14,
           $15,
           $16,
           $17::jsonb,
           $18,
           $19,
           $20
         )
         RETURNING *`,
        [
          actor.profileId,
          body.category ?? body.classification?.category ?? null,
          body.description,
          body.quantity,
          body.unit,
          body.estimatedWeightKg,
          body.unitValueBrl ?? null,
          body.disposalCostBrl ?? null,
          body.perishabilityMinutes,
          JSON.stringify(body.pickupAddress),
          body.pickupAddress.location.longitude,
          body.pickupAddress.location.latitude,
          body.availableFrom,
          body.expiresAt,
          photoId ? photoPath(photoId) : (body.imageUrl ?? null),
          photoId ?? null,
          body.classification ? JSON.stringify(body.classification) : null,
          body.classification?.confidence ?? null,
          correlationId,
          key,
        ],
      );
      const donation = mapDonation(inserted.rows[0]);
      const event = await client.query<{ id: string }>(
        `INSERT INTO events (
           donation_id, from_status, to_status, event_type, correlation_id, payload
         ) VALUES ($1, NULL, 'posted', 'donation.created', $2, $3::jsonb)
         RETURNING id`,
        [
          donation.id,
          correlationId,
          JSON.stringify({ sellerId: actor.profileId }),
        ],
      );
      await client.query(
        `INSERT INTO outbox (
           topic, event_type, aggregate_id, correlation_id, causation_id, payload
         ) VALUES (
           'donation.created', 'donation.created', $1, $2, $3, $4::jsonb
         )`,
        [
          donation.id,
          correlationId,
          event.rows[0]?.id,
          JSON.stringify({ donationId: donation.id }),
        ],
      );
      return { status: 201, body: donation, resourceId: donation.id };
    },
    200,
  );

  return json(result.status, result.body, correlationId, {
    Location: `/api/donations/${result.resourceId}`,
  });
};

export const getDonation: ApiHandler = async (request) => {
  const donationId = pathUuid(request, "donationId");
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request);
    const visibility = donationVisibility(actor);
    const result = await client.query(
      `SELECT donation.*
       FROM donations AS donation
       WHERE donation.id = $2 AND ${visibility.sql}`,
      [...visibility.params, donationId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new ApiError(404, "not_found", "Doação não encontrada.");
    }
    const events = await client.query(
      `SELECT *
       FROM events
       WHERE donation_id = $1
       ORDER BY occurred_at, id`,
      [donationId],
    );
    const pickups = await sellerPickups(client, actor, [row]);
    return json(200, {
      ...mapDonation(row),
      ...(pickups ? { pickup: pickups.get(row.id) ?? null } : {}),
      timeline: events.rows.map(mapDonationEvent),
    });
  } finally {
    client.release();
  }
};

export const listDonationEvents: ApiHandler = async (request) => {
  const donationId = uuidSchema.parse(request.params.donationId);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request);
    const visibility = donationVisibility(actor);
    const visible = await client.query(
      `SELECT 1
       FROM donations AS donation
       WHERE donation.id = $2 AND ${visibility.sql}`,
      [...visibility.params, donationId],
    );
    if (!visible.rowCount) {
      throw new ApiError(404, "not_found", "Doação não encontrada.");
    }
    const result = await client.query(
      `SELECT *
       FROM events
       WHERE donation_id = $1
       ORDER BY occurred_at, id`,
      [donationId],
    );
    return json(200, { items: result.rows.map(mapDonationEvent) });
  } finally {
    client.release();
  }
};
