import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { Actor } from "./auth.js";
import { inTransaction } from "./db.js";
import { ApiError } from "./errors.js";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type StoredRecord = {
  actor_user_id: string | null;
  request_hash: string;
  response_status: number | null;
  response_body: JsonValue | null;
  resource_id: string | null;
};

export type IdempotentResult = {
  status: number;
  body: JsonValue;
  resourceId?: string;
};

export type IdempotentResponse = IdempotentResult & {
  replayed: boolean;
};

function stableValue(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return String(value);
}

export function requestHash(scope: string, payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify({ scope, payload: stableValue(payload) }))
    .digest("hex");
}

export async function idempotentTransaction(
  scope: string,
  key: string,
  actor: Actor,
  payload: unknown,
  operation: (client: PoolClient) => Promise<IdempotentResult>,
  replayStatus?: number,
): Promise<IdempotentResponse> {
  const hash = requestHash(scope, payload);
  return inTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO idempotency_keys (
         scope, idempotency_key, actor_user_id, request_hash, expires_at
       ) VALUES ($1, $2, $3, $4, now() + interval '24 hours')
       ON CONFLICT DO NOTHING
       RETURNING scope`,
      [scope, key, actor.id, hash],
    );

    if (inserted.rowCount === 0) {
      const existing = await client.query<StoredRecord>(
        `SELECT actor_user_id, request_hash, response_status, response_body, resource_id
         FROM idempotency_keys
         WHERE scope = $1 AND idempotency_key = $2
         FOR UPDATE`,
        [scope, key],
      );
      const record = existing.rows[0];
      if (
        !record ||
        record.actor_user_id !== actor.id ||
        record.request_hash !== hash
      ) {
        throw new ApiError(
          409,
          "idempotency_conflict",
          "A chave de idempotência já foi usada com outra requisição.",
        );
      }
      if (record.response_status === null || record.response_body === null) {
        throw new ApiError(
          409,
          "idempotency_in_progress",
          "A requisição com esta chave ainda está em processamento.",
        );
      }
      return {
        status: replayStatus ?? record.response_status,
        body: record.response_body,
        ...(record.resource_id ? { resourceId: record.resource_id } : {}),
        replayed: true,
      };
    }

    const result = await operation(client);
    await client.query(
      `UPDATE idempotency_keys
       SET response_status = $3, response_body = $4::jsonb, resource_id = $5
       WHERE scope = $1 AND idempotency_key = $2`,
      [
        scope,
        key,
        result.status,
        JSON.stringify(result.body),
        result.resourceId ?? null,
      ],
    );
    return { ...result, replayed: false };
  });
}
