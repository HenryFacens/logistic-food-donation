import { getPool } from "../db.js";
import { requireActor } from "../auth.js";
import { json, type ApiHandler } from "../http.js";

export const listNgos: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    await requireActor(client, request);
    const result = await client.query(
      `SELECT
         ngo.id,
         ngo.user_id AS "userId",
         ngo.name,
         ngo.document,
         ngo.address,
         ngo.capacity_kg::float8 AS "capacityKg",
         ngo.current_load_kg::float8 AS "currentLoadKg",
         ngo.service_radius_km::float8 AS "serviceRadiusKm",
         ngo.accepted_categories::text[] AS "acceptedCategories",
         ngo.category_needs AS "categoryNeeds",
         ngo.active
       FROM ngos AS ngo
       WHERE ngo.active
       ORDER BY ngo.name`,
    );
    return json(200, { items: result.rows });
  } finally {
    client.release();
  }
};
