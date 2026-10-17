import { getPool } from "../db.js";
import { requireActor } from "../auth.js";
import { json, type ApiHandler } from "../http.js";
import { mapDemoUser } from "../mappers.js";

export const listDemoUsers: ApiHandler = async () => {
  const result = await getPool().query(
    `SELECT id, demo_key, role, display_name, phone
     FROM users
     ORDER BY role, display_name`,
  );
  return json(200, { items: result.rows.map(mapDemoUser) });
};

export const getCurrentUser: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request);
    const capacity =
      actor.role === "driver"
        ? await client.query<{ capacity_kg: string }>(
            "SELECT capacity_kg FROM drivers WHERE id = $1",
            [actor.profileId],
          )
        : null;
    const capacityKg = capacity?.rows[0]
      ? Number(capacity.rows[0].capacity_kg)
      : undefined;
    return json(200, {
      id: actor.id,
      demoKey: actor.demoKey,
      role: actor.role,
      displayName: actor.displayName,
      phone: actor.phone,
      profileId: actor.profileId,
      ...(capacityKg === undefined ? {} : { capacityKg }),
    });
  } finally {
    client.release();
  }
};
