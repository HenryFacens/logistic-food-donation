import {
  COLLECTION_REWARD_POINTS,
  assignPickupRequestSchema,
  calculateRewardPoints,
  confirmPickupRequestSchema,
  paginationQuerySchema,
  pickupStatusSchema,
} from "@resgata/shared";
import { randomUUID } from "node:crypto";
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
import {
  mapPickup,
  pickupSelect,
  pickupSummaryJoins,
  pickupSummarySelect,
} from "../mappers.js";
import { decodeCursor, pageFrom } from "../pagination.js";

export const listPickups: ApiHandler = async (request) => {
  const query = paginationQuerySchema.parse({
    cursor: request.query.get("cursor") ?? undefined,
    limit: request.query.get("limit") ?? undefined,
  });
  const rawStatus = request.query.get("status");
  const status = rawStatus ? pickupStatusSchema.parse(rawStatus) : undefined;
  const cursor = decodeCursor(query.cursor);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["ngo", "driver"]);
    const values: unknown[] = [actor.profileId];
    const isDriver = actor.role === "driver";
    const filters = [
      isDriver
        ? // Unassigned pickups only show to available drivers whose vehicle fits the load.
          `(pickup.driver_id = $1 OR (
             pickup.driver_id IS NULL
             AND viewer_driver.active
             AND donation.estimated_weight_kg <= viewer_driver.capacity_kg
           ))`
        : "pickup.ngo_id = $1",
    ];
    if (status) {
      values.push(status);
      filters.push(`pickup.status = $${values.length}`);
    }
    if (cursor) {
      values.push(cursor.createdAt, cursor.id);
      filters.push(
        `(pickup.created_at, pickup.id) < ($${values.length - 1}, $${values.length})`,
      );
    }
    values.push(query.limit + 1);
    const result = await client.query(
      `SELECT ${pickupSummarySelect},
              ${isDriver ? "ST_Distance(viewer_driver.current_location, pickup.pickup_location) / 1000.0" : "NULL"} AS distance_km
       FROM pickups AS pickup
       ${pickupSummaryJoins(isDriver ? "$1" : null)}
       WHERE ${filters.join(" AND ")}
       ORDER BY ${
         isDriver
           ? `CASE
                WHEN pickup.driver_id = $1 AND pickup.status NOT IN ('delivered', 'cancelled') THEN 0
                WHEN pickup.driver_id IS NULL THEN 1
                ELSE 2
              END,
              CASE WHEN pickup.driver_id IS NULL
                THEN ST_Distance(viewer_driver.current_location, pickup.pickup_location)
              END,`
           : ""
       }
                pickup.created_at DESC, pickup.id DESC
       LIMIT $${values.length}`,
      values,
    );
    const codes = actor.role === "ngo" ? "delivery" : "none";
    return json(
      200,
      pageFrom(
        result.rows.map((row) => mapPickup(row, { codes })),
        query.limit,
      ),
    );
  } finally {
    client.release();
  }
};

export const assignPickup: ApiHandler = async (request) => {
  const pickupId = pathUuid(request, "pickupId");
  const body = await parseJson(request, assignPickupRequestSchema);
  const key = idempotencyKeyFrom(request);
  const correlationId =
    request.headers.get("x-correlation-id") ?? randomUUID();
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["ngo", "driver"]);
    if (actor.role === "driver" && actor.profileId !== body.driverId) {
      throw new ApiError(
        401,
        "role_not_allowed",
        "O motorista só pode atribuir a coleta a si mesmo.",
      );
    }
  } finally {
    authClient.release();
  }

  const result = await idempotentTransaction(
    "pickups.assign",
    key,
    actor,
    { pickupId, ...body },
    async (client) => {
      // The vehicle must fit this load plus everything already on board.
      // Locking the driver row serializes concurrent accepts for one driver.
      const load = await client.query<{ capacity: number; on_board: number; weight: number }>(
        `SELECT driver.capacity_kg::float8 AS capacity,
                coalesce((
                  SELECT sum(donation.estimated_weight_kg)
                  FROM pickups AS active
                  JOIN donations AS donation ON donation.id = active.donation_id
                  WHERE active.driver_id = driver.id
                    AND active.status IN ('assigned', 'en_route_pickup', 'collected', 'en_route_delivery')
                ), 0)::float8 AS on_board,
                (SELECT donation.estimated_weight_kg::float8
                 FROM pickups AS pickup
                 JOIN donations AS donation ON donation.id = pickup.donation_id
                 WHERE pickup.id = $2) AS weight
         FROM drivers AS driver
         WHERE driver.id = $1
         FOR UPDATE OF driver`,
        [body.driverId, pickupId],
      );
      const vehicle = load.rows[0];
      if (vehicle && vehicle.weight !== null && vehicle.on_board + vehicle.weight > vehicle.capacity) {
        throw new ApiError(
          409,
          "capacity_exceeded",
          `A carga passaria da capacidade do veículo (${vehicle.capacity} kg).`,
        );
      }
      const updated = await client.query(
        `UPDATE pickups AS pickup
         SET driver_id = $2,
             status = 'assigned',
             assigned_at = now(),
             updated_at = now()
         WHERE pickup.id = $1
           AND pickup.status = 'awaiting_driver'
           AND (
             $3::demo_role = 'driver'
             OR pickup.ngo_id = $4
           )
           AND EXISTS (
             SELECT 1 FROM drivers AS driver
             WHERE driver.id = $2 AND driver.active
           )
         RETURNING ${pickupSelect}`,
        [pickupId, body.driverId, actor.role, actor.profileId],
      );
      if (!updated.rows[0]) {
        throw new ApiError(
          409,
          "state_conflict",
          "A coleta não está disponível para atribuição.",
        );
      }
      const pickup = mapPickup(updated.rows[0], {
        codes: actor.role === "ngo" ? "delivery" : "none",
      });
      await client.query(
        `INSERT INTO events (
           donation_id, from_status, to_status, event_type, correlation_id, payload
         ) VALUES (
           $1, 'accepted', 'accepted', 'pickup.assigned', $2, $3::jsonb
         )`,
        [
          pickup.donationId,
          correlationId,
          JSON.stringify({ pickupId, driverId: body.driverId }),
        ],
      );
      return { status: 200, body: pickup, resourceId: pickup.id };
    },
  );
  return json(result.status, result.body, correlationId);
};

async function confirmPickupState(
  request: Parameters<ApiHandler>[0],
  action: "collect" | "deliver",
) {
  const pickupId = pathUuid(request, "pickupId");
  const body = await parseJson(request, confirmPickupRequestSchema);
  const key = idempotencyKeyFrom(request);
  const correlationId =
    request.headers.get("x-correlation-id") ?? randomUUID();
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["driver"]);
  } finally {
    authClient.release();
  }

  const definition =
    action === "collect"
      ? {
          currentPickup: ["assigned", "en_route_pickup"],
          nextPickup: "collected",
          codeColumn: "pickup_code",
          currentDonation: "accepted",
          nextDonation: "collected",
          eventType: "pickup.collected",
          timestamp: "collected_at",
        }
      : {
          currentPickup: ["collected", "en_route_delivery"],
          nextPickup: "delivered",
          codeColumn: "delivery_code",
          currentDonation: "collected",
          nextDonation: "delivered",
          eventType: "pickup.delivered",
          timestamp: "delivered_at",
        };

  const result = await idempotentTransaction(
    `pickups.${action}`,
    key,
    actor,
    { pickupId, ...body },
    async (client) => {
      const locked = await client.query<{
        donation_id: string;
        status: string;
        expected_code: string;
        weight_kg: string;
      }>(
        `SELECT pickup.donation_id,
                pickup.status,
                pickup.${definition.codeColumn} AS expected_code,
                donation.estimated_weight_kg AS weight_kg
         FROM pickups AS pickup
         JOIN donations AS donation ON donation.id = pickup.donation_id
         WHERE pickup.id = $1 AND pickup.driver_id = $2
         FOR UPDATE OF pickup`,
        [pickupId, actor.profileId],
      );
      const pickup = locked.rows[0];
      if (!pickup) {
        throw new ApiError(404, "not_found", "Coleta não encontrada.");
      }
      if (!definition.currentPickup.includes(pickup.status)) {
        throw new ApiError(
          409,
          "state_conflict",
          "A coleta não está no estado esperado.",
        );
      }
      if (pickup.expected_code.trim() !== body.code) {
        throw new ApiError(422, "invalid_code", "Código de confirmação inválido.");
      }

      await client.query(
        `UPDATE pickups
         SET status = $2,
             ${definition.timestamp} = now(),
             updated_at = now()
         WHERE id = $1`,
        [pickupId, definition.nextPickup],
      );
      await client.query(
        `SELECT * FROM transition_donation(
           $1, $2::donation_status, $3::donation_status, $4, $5, $6::jsonb,
           'pickup.confirmed'
         )`,
        [
          pickup.donation_id,
          definition.currentDonation,
          definition.nextDonation,
          definition.eventType,
          correlationId,
          JSON.stringify({
            pickupId,
            pickupStatus: definition.nextPickup,
            location: body.location,
            driverId: actor.profileId,
          }),
        ],
      );
      // Same rule as `summary.rewardPoints`, so the card matches the credit.
      const points =
        action === "collect"
          ? COLLECTION_REWARD_POINTS
          : calculateRewardPoints(Number(pickup.weight_kg));
      await client.query(
        "UPDATE drivers SET points = points + $2 WHERE id = $1",
        [actor.profileId, points],
      );
      const updated = await client.query(
        `SELECT ${pickupSelect}
         FROM pickups AS pickup
         WHERE pickup.id = $1`,
        [pickupId],
      );
      const response = mapPickup(updated.rows[0], { codes: "none" });
      return { status: 200, body: response, resourceId: response.id };
    },
  );
  return json(result.status, result.body, correlationId);
}

export const confirmCollection: ApiHandler = (request) =>
  confirmPickupState(request, "collect");

export const confirmDelivery: ApiHandler = (request) =>
  confirmPickupState(request, "deliver");
