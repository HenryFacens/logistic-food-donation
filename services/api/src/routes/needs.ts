import {
  createNgoNeedRequestSchema,
  ngoAvailabilitySchema,
  ngoNeedSchema,
  updateNgoAvailabilityRequestSchema,
} from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { json, parseJson, pathUuid, type ApiHandler } from "../http.js";

const needSelect = `
  need.id,
  need.ngo_id,
  ngo.name AS ngo_name,
  need.category::text AS category,
  need.item,
  need.quantity::float8 AS quantity,
  need.unit::text AS unit,
  need.remaining_quantity::float8 AS remaining_quantity,
  need.needed_by,
  need.notes,
  need.status::text AS status,
  need.created_at`;

type NeedRow = {
  id: string;
  ngo_id: string;
  ngo_name: string;
  category: string;
  item: string;
  quantity: number;
  unit: string;
  remaining_quantity: number;
  needed_by: Date;
  notes: string | null;
  status: string;
  created_at: Date;
  distance_km?: number;
};

const mapNeed = (row: NeedRow) =>
  ngoNeedSchema.parse({
    id: row.id,
    ngoId: row.ngo_id,
    ngoName: row.ngo_name,
    category: row.category,
    item: row.item,
    quantity: row.quantity,
    unit: row.unit,
    remainingQuantity: row.remaining_quantity,
    neededBy: row.needed_by.toISOString(),
    notes: row.notes,
    status: row.status,
    distanceKm:
      row.distance_km === undefined
        ? undefined
        : Math.round(row.distance_km * 10) / 10,
    createdAt: row.created_at.toISOString(),
  });

async function asActor<T>(
  request: Parameters<ApiHandler>[0],
  role: "ngo" | "seller",
  run: (client: import("pg").PoolClient, profileId: string) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, [role]);
    return await run(client, actor.profileId);
  } finally {
    client.release();
  }
}

// Expire needs whose deadline passed so they stop attracting donations.
const closeExpired = `
  UPDATE ngo_needs
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'open' AND needed_by < now()`;

export const listMyNeeds: ApiHandler = async (request) =>
  asActor(request, "ngo", async (client, ngoId) => {
    await client.query(`${closeExpired} AND ngo_id = $1`, [ngoId]);
    const result = await client.query<NeedRow>(
      `SELECT ${needSelect}
       FROM ngo_needs AS need
       JOIN ngos AS ngo ON ngo.id = need.ngo_id
       WHERE need.ngo_id = $1
       ORDER BY (need.status = 'open') DESC, need.needed_by, need.id
       LIMIT 50`,
      [ngoId],
    );
    return json(200, { items: result.rows.map(mapNeed) });
  });

export const createNeed: ApiHandler = async (request) => {
  const body = await parseJson(request, createNgoNeedRequestSchema);
  if (new Date(body.neededBy) <= new Date()) {
    throw new ApiError(422, "invalid_deadline", "O prazo precisa estar no futuro.");
  }
  return asActor(request, "ngo", async (client, ngoId) => {
    const accepted = await client.query(
      "SELECT 1 FROM ngos WHERE id = $1 AND $2::donation_category = ANY (accepted_categories)",
      [ngoId, body.category],
    );
    if (!accepted.rowCount) {
      await client.query(
        `UPDATE ngos
         SET accepted_categories = array_append(accepted_categories, $2::donation_category)
         WHERE id = $1`,
        [ngoId, body.category],
      );
    }
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO ngo_needs (
         ngo_id, category, item, quantity, unit, remaining_quantity, needed_by, notes
       ) VALUES ($1, $2, $3, $4, $5, $4, $6, $7)
       RETURNING id`,
      [
        ngoId,
        body.category,
        body.item,
        body.quantity,
        body.unit,
        body.neededBy,
        body.notes ?? null,
      ],
    );
    const result = await client.query<NeedRow>(
      `SELECT ${needSelect}
       FROM ngo_needs AS need JOIN ngos AS ngo ON ngo.id = need.ngo_id
       WHERE need.id = $1`,
      [inserted.rows[0]!.id],
    );
    return json(201, mapNeed(result.rows[0]!));
  });
};

export const cancelNeed: ApiHandler = async (request) => {
  const needId = pathUuid(request, "needId");
  return asActor(request, "ngo", async (client, ngoId) => {
    const updated = await client.query(
      `UPDATE ngo_needs SET status = 'cancelled', updated_at = now()
       WHERE id = $1 AND ngo_id = $2 AND status = 'open'`,
      [needId, ngoId],
    );
    if (!updated.rowCount) {
      throw new ApiError(404, "not_found", "Pedido não encontrado ou já encerrado.");
    }
    return json(200, { cancelled: true });
  });
};

const availabilitySql = `
  SELECT
    to_char(receiving_start, 'HH24:MI') AS "receivingStart",
    to_char(receiving_end, 'HH24:MI') AS "receivingEnd",
    capacity_kg::float8 AS "capacityKg",
    (capacity_kg - current_load_kg)::float8 AS "availableCapacityKg"
  FROM ngos WHERE id = $1`;

export const getNgoAvailability: ApiHandler = async (request) =>
  asActor(request, "ngo", async (client, ngoId) => {
    const result = await client.query(availabilitySql, [ngoId]);
    return json(200, ngoAvailabilitySchema.parse(result.rows[0]));
  });

export const updateNgoAvailability: ApiHandler = async (request) => {
  const body = await parseJson(request, updateNgoAvailabilityRequestSchema);
  return asActor(request, "ngo", async (client, ngoId) => {
    await client.query(
      `UPDATE ngos
       SET receiving_start = $2::time,
           receiving_end = $3::time,
           current_load_kg = greatest(0, capacity_kg - least($4::numeric, capacity_kg))
       WHERE id = $1`,
      [ngoId, body.receivingStart, body.receivingEnd, body.availableCapacityKg],
    );
    const result = await client.query(availabilitySql, [ngoId]);
    return json(200, ngoAvailabilitySchema.parse(result.rows[0]));
  });
};

// Seller view: open needs from NGOs whose service area covers the shop.
export const listNearbyNeeds: ApiHandler = async (request) =>
  asActor(request, "seller", async (client, sellerId) => {
    await client.query(closeExpired);
    const result = await client.query<NeedRow>(
      `SELECT ${needSelect},
              ST_Distance(ngo.location, seller.location) / 1000.0 AS distance_km
       FROM ngo_needs AS need
       JOIN ngos AS ngo ON ngo.id = need.ngo_id AND ngo.active
       JOIN sellers AS seller ON seller.id = $1
       WHERE need.status = 'open'
         AND need.remaining_quantity > 0
         AND ST_DWithin(ngo.location, seller.location, ngo.service_radius_km * 1000)
       ORDER BY need.needed_by, distance_km
       LIMIT 12`,
      [sellerId],
    );
    return json(200, { items: result.rows.map(mapNeed) });
  });
