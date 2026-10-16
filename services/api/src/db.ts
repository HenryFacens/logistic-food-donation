import pg from "pg";
import type { PoolClient } from "pg";
import { getConfig } from "./config.js";

const { Pool } = pg;
let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  pool ??= new Pool({
    connectionString: getConfig().DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

export async function inTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
