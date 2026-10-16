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
    return json(200, {
      id: actor.id,
      demoKey: actor.demoKey,
      role: actor.role,
      displayName: actor.displayName,
      phone: actor.phone,
      profileId: actor.profileId,
    });
  } finally {
    client.release();
  }
};
