import {
  createDriverRatingRequestSchema,
  ratingOpportunitiesRequestSchema,
  ratingOpportunitiesResponseSchema,
} from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import {
  correlationIdFrom,
  idempotencyKeyFrom,
  json,
  parseJson,
  pathUuid,
  type ApiHandler,
} from "../http.js";
import { idempotentTransaction } from "../idempotency.js";
import { mapDriverRating } from "../mappers.js";
import { decodeCursor, pageFrom } from "../pagination.js";

function sameRating(
  row: Record<string, unknown>,
  body: { rating: number; tags: string[]; comment?: string },
): boolean {
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  return (
    Number(row.rating) === body.rating &&
    JSON.stringify(tags) === JSON.stringify(body.tags) &&
    (row.comment ?? null) === (body.comment ?? null)
  );
}

export const listDriverRatingOpportunities: ApiHandler = async (request) => {
  const query = ratingOpportunitiesRequestSchema.parse({
    status: request.query.get("status") ?? undefined,
    cursor: request.query.get("cursor") ?? undefined,
    limit: request.query.get("limit") ?? undefined,
  });
  const cursor = decodeCursor(query.cursor);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["seller"]);
    const values: unknown[] = [actor.profileId, actor.id];
    const filters = [
      "donation.seller_id = $1",
      "pickup.status = 'delivered'",
      "pickup.driver_id IS NOT NULL",
    ];
    filters.push(
      query.status === "completed"
        ? "rating.id IS NOT NULL"
        : "rating.id IS NULL",
    );
    if (cursor) {
      values.push(cursor.createdAt, cursor.id);
      filters.push(
        `(coalesce(receipt.created_at, pickup.delivered_at), pickup.id)
          < ($${values.length - 1}, $${values.length})`,
      );
    }
    values.push(query.limit + 1);
    const result = await client.query(
      `SELECT
         pickup.id AS pickup_id,
         pickup.donation_id,
         donation.description AS donation_description,
         pickup.driver_id,
         driver.name AS driver_display_name,
         coalesce(receipt.created_at, pickup.delivered_at) AS available_at,
         rating.id AS rating_id,
         rating.reviewer_user_id,
         rating.reviewer_role,
         rating.rating,
         rating.tags,
         rating.comment,
         rating.simulated AS rating_simulated,
         rating.simulation_label AS rating_simulation_label,
         rating.created_at AS rating_created_at,
         rating.updated_at AS rating_updated_at
       FROM pickups AS pickup
       JOIN donations AS donation ON donation.id = pickup.donation_id
       JOIN drivers AS driver ON driver.id = pickup.driver_id
       JOIN delivery_receipts AS receipt ON receipt.pickup_id = pickup.id
       LEFT JOIN driver_ratings AS rating
         ON rating.pickup_id = pickup.id
        AND rating.reviewer_user_id = $2
       WHERE ${filters.join(" AND ")}
       ORDER BY
         coalesce(receipt.created_at, pickup.delivered_at) DESC,
         pickup.id DESC
       LIMIT $${values.length}`,
      values,
    );
    const rows = result.rows.map((row) => ({
      id: row.pickup_id,
      pickupId: row.pickup_id,
      donationId: row.donation_id,
      donationDescription: row.donation_description,
      driverId: row.driver_id,
      driverDisplayName: row.driver_display_name,
      reviewerRole: "seller" as const,
      status: row.rating_id ? ("completed" as const) : ("available" as const),
      availableAt:
        row.available_at instanceof Date
          ? row.available_at.toISOString()
          : String(row.available_at),
      completedRating: row.rating_id
        ? mapDriverRating({
            id: row.rating_id,
            pickup_id: row.pickup_id,
            driver_id: row.driver_id,
            reviewer_user_id: row.reviewer_user_id,
            reviewer_role: row.reviewer_role,
            rating: row.rating,
            tags: row.tags,
            comment: row.comment,
            simulated: row.rating_simulated,
            simulation_label: row.rating_simulation_label,
            created_at: row.rating_created_at,
            updated_at: row.rating_updated_at,
          })
        : null,
      createdAt:
        row.available_at instanceof Date
          ? row.available_at.toISOString()
          : String(row.available_at),
    }));
    const page = pageFrom(rows, query.limit);
    return json(
      200,
      ratingOpportunitiesResponseSchema.parse({
        items: page.items.map(
          ({ id: _id, createdAt: _createdAt, ...item }) => item,
        ),
        page: page.page,
      }),
    );
  } finally {
    client.release();
  }
};

export const createDriverRating: ApiHandler = async (request) => {
  const pickupId = pathUuid(request, "pickupId");
  const body = await parseJson(request, createDriverRatingRequestSchema);
  const key = idempotencyKeyFrom(request);
  const correlationId = correlationIdFrom(request);
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["seller", "ngo"]);
  } finally {
    authClient.release();
  }

  const result = await idempotentTransaction(
    "pickups.driver-rating",
    key,
    actor,
    { pickupId, ...body },
    async (client) => {
      const pickupResult = await client.query<{
        driver_id: string | null;
        status: string;
        simulated: boolean;
      }>(
        `SELECT pickup.driver_id, pickup.status, donation.simulated
         FROM pickups AS pickup
         JOIN donations AS donation ON donation.id = pickup.donation_id
         WHERE pickup.id = $1
           AND EXISTS (
             SELECT 1
             FROM delivery_receipts AS receipt
             WHERE receipt.pickup_id = pickup.id
           )
           AND (
             ($2::demo_role = 'seller' AND donation.seller_id = $3)
             OR ($2::demo_role = 'ngo' AND pickup.ngo_id = $3)
           )
         FOR UPDATE OF pickup`,
        [pickupId, actor.role, actor.profileId],
      );
      const pickup = pickupResult.rows[0];
      if (!pickup) {
        throw new ApiError(404, "not_found", "Entrega não encontrada.");
      }
      if (pickup.status !== "delivered" || !pickup.driver_id) {
        throw new ApiError(
          409,
          "state_conflict",
          "O motorista só pode ser avaliado após a entrega.",
        );
      }

      const existing = await client.query(
        `SELECT *
         FROM driver_ratings
         WHERE pickup_id = $1 AND reviewer_user_id = $2`,
        [pickupId, actor.id],
      );
      if (existing.rows[0]) {
        if (!sameRating(existing.rows[0], body)) {
          throw new ApiError(
            409,
            "rating_already_recorded",
            "Este usuário já avaliou o motorista desta entrega.",
          );
        }
        const rating = mapDriverRating(existing.rows[0]);
        return { status: 200, body: rating, resourceId: rating.id };
      }

      const inserted = await client.query(
        `INSERT INTO driver_ratings (
           pickup_id,
           driver_id,
           reviewer_user_id,
           reviewer_role,
           rating,
           tags,
           comment,
           simulated,
           simulation_label
         ) VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9)
         RETURNING *`,
        [
          pickupId,
          pickup.driver_id,
          actor.id,
          actor.role,
          body.rating,
          body.tags,
          body.comment ?? null,
          pickup.simulated,
          pickup.simulated ? "SIMULADO" : null,
        ],
      );
      const rating = mapDriverRating(inserted.rows[0]);
      return { status: 201, body: rating, resourceId: rating.id };
    },
    200,
  );
  return json(result.status, result.body, correlationId);
};
