import {
  paginationQuerySchema,
} from "@resgata/shared";
import { randomUUID } from "node:crypto";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import {
  idempotencyKeyFrom,
  json,
  pathUuid,
  type ApiHandler,
} from "../http.js";
import { idempotentTransaction } from "../idempotency.js";
import {
  mapCoupon,
  mapCouponRedemption,
} from "../mappers.js";
import { decodeCursor, pageFrom } from "../pagination.js";

export const listCoupons: ApiHandler = async (request) => {
  const query = paginationQuerySchema.parse({
    cursor: request.query.get("cursor") ?? undefined,
    limit: request.query.get("limit") ?? undefined,
  });
  const cursor = decodeCursor(query.cursor);
  const client = await getPool().connect();
  try {
    await requireActor(client, request, ["driver"]);
    const values: unknown[] = [];
    const filters = [
      "coupon.active",
      "coupon.stock > 0",
      "coupon.valid_from <= now()",
      "coupon.valid_until > now()",
    ];
    if (cursor) {
      values.push(cursor.createdAt, cursor.id);
      filters.push(
        `(coupon.created_at, coupon.id) < ($1, $2)`,
      );
    }
    values.push(query.limit + 1);
    const result = await client.query(
      `SELECT coupon.*
       FROM coupons AS coupon
       WHERE ${filters.join(" AND ")}
       ORDER BY coupon.created_at DESC, coupon.id DESC
       LIMIT $${values.length}`,
      values,
    );
    const rows = result.rows.map((row) => ({
      ...mapCoupon(row),
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    }));
    const page = pageFrom(rows, query.limit);
    return json(200, {
      items: page.items.map(({ createdAt: _createdAt, ...coupon }) => coupon),
      page: page.page,
    });
  } finally {
    client.release();
  }
};

export const redeemCoupon: ApiHandler = async (request) => {
  const couponId = pathUuid(request, "couponId");
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

  const result = await idempotentTransaction(
    "coupons.redeem",
    key,
    actor,
    { couponId },
    async (client) => {
      const locked = await client.query<{
        stock: number;
        points_cost: number;
        active: boolean;
        valid_now: boolean;
        points: number;
      }>(
        `SELECT
           coupon.stock,
           coupon.points_cost,
           coupon.active,
           coupon.valid_from <= now() AND coupon.valid_until > now() AS valid_now,
           driver.points
         FROM coupons AS coupon
         CROSS JOIN drivers AS driver
         WHERE coupon.id = $1 AND driver.id = $2
         FOR UPDATE OF coupon, driver`,
        [couponId, actor.profileId],
      );
      const row = locked.rows[0];
      if (!row) {
        throw new ApiError(404, "not_found", "Cupom não encontrado.");
      }
      if (!row.active || !row.valid_now || Number(row.stock) <= 0) {
        throw new ApiError(409, "coupon_unavailable", "Cupom indisponível.");
      }
      if (Number(row.points) < Number(row.points_cost)) {
        throw new ApiError(
          409,
          "insufficient_points",
          "Saldo de pontos insuficiente.",
        );
      }
      await client.query("UPDATE coupons SET stock = stock - 1 WHERE id = $1", [
        couponId,
      ]);
      await client.query(
        "UPDATE drivers SET points = points - $2 WHERE id = $1",
        [actor.profileId, row.points_cost],
      );
      const inserted = await client.query(
        `INSERT INTO redemptions (
           coupon_id, driver_id, idempotency_key, redemption_code
         ) VALUES (
           $1, $2, $3, 'RSG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
         )
         RETURNING *`,
        [couponId, actor.profileId, key],
      );
      const redemption = mapCouponRedemption(inserted.rows[0]);
      return {
        status: 201,
        body: redemption,
        resourceId: redemption.id,
      };
    },
    200,
  );
  return json(result.status, result.body, correlationId);
};
