import type { ApiHandler } from "../http.js";
import { getConfig } from "../config.js";
import { getPool } from "../db.js";
import { json } from "../http.js";

export const health: ApiHandler = async () => {
  const config = getConfig();
  let database: "up" | "down" = "up";
  try {
    await getPool().query("SELECT 1");
  } catch {
    database = "down";
  }

  const messageBus =
    config.QUEUE_DRIVER === "pg" || config.SERVICE_BUS_CONNECTION_STRING
      ? "up"
      : "down";
  const status = database === "up" && messageBus === "up" ? "ok" : "degraded";
  return json(status === "ok" ? 200 : 503, {
    status,
    version: config.API_VERSION,
    database,
    messageBus,
    checkedAt: new Date().toISOString(),
  });
};
