import {
  paginationQuerySchema,
  queueNameSchema,
  replayDeadLetterRequestSchema,
} from "@resgata/shared";
import { randomUUID } from "node:crypto";
import { requireActor } from "../auth.js";
import { getConfig } from "../config.js";
import { getPool } from "../db.js";
import {
  idempotencyKeyFrom,
  json,
  parseJson,
  type ApiHandler,
} from "../http.js";
import { idempotentTransaction } from "../idempotency.js";
import { decodeCursor, pageFrom } from "../pagination.js";

export const getQueueDashboard: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    await requireActor(client, request, ["platform"]);
    const result = await client.query(
      `WITH topics(name) AS (
         VALUES
           ('donation.created'),
           ('donation.classified'),
           ('offer.sent'),
           ('offer.timeout'),
           ('pickup.confirmed')
       )
       SELECT
         topics.name,
         (
           SELECT count(*)::int FROM outbox
           WHERE topic = topics.name AND status IN ('pending', 'failed')
         ) AS ready,
         (
           SELECT count(*)::int FROM jobs
           WHERE topic = topics.name AND status = 'scheduled'
         ) AS scheduled,
         (
           SELECT count(*)::int FROM outbox
           WHERE topic = topics.name AND status = 'processing'
         ) AS processing,
         (
           SELECT count(*)::int FROM dead_letter_messages
           WHERE topic = topics.name AND replayed_at IS NULL
         ) AS "deadLetter",
         (
           SELECT min(created_at) FROM outbox
           WHERE topic = topics.name AND status IN ('pending', 'failed', 'processing')
         ) AS "oldestMessageAt"
       FROM topics`,
    );
    return json(200, {
      driver: getConfig().QUEUE_DRIVER,
      queues: result.rows.map((row) => ({
        ...row,
        oldestMessageAt: row.oldestMessageAt
          ? new Date(row.oldestMessageAt).toISOString()
          : null,
      })),
      checkedAt: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
};

export const listDeadLetters: ApiHandler = async (request) => {
  const query = paginationQuerySchema.parse({
    cursor: request.query.get("cursor") ?? undefined,
    limit: request.query.get("limit") ?? undefined,
  });
  const topicValue = request.query.get("topic");
  const topic = topicValue ? queueNameSchema.parse(topicValue) : undefined;
  const cursor = decodeCursor(query.cursor);
  const client = await getPool().connect();
  try {
    await requireActor(client, request, ["platform"]);
    const values: unknown[] = [];
    const filters = ["replayed_at IS NULL"];
    if (topic) {
      values.push(topic);
      filters.push(`topic = $${values.length}`);
    }
    if (cursor) {
      values.push(cursor.createdAt, cursor.id);
      filters.push(
        `(dead_lettered_at, id) < ($${values.length - 1}, $${values.length})`,
      );
    }
    values.push(query.limit + 1);
    const result = await client.query(
      `SELECT *
       FROM dead_letter_messages
       WHERE ${filters.join(" AND ")}
       ORDER BY dead_lettered_at DESC, id DESC
       LIMIT $${values.length}`,
      values,
    );
    const rows = result.rows.map((row) => ({
      id: row.id,
      originalMessageId: row.original_message_id,
      topic: row.topic,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      correlationId: row.correlation_id,
      payload: row.payload,
      attempts: Number(row.attempts),
      error: row.error,
      deadLetteredAt: new Date(row.dead_lettered_at).toISOString(),
      replayedAt: row.replayed_at
        ? new Date(row.replayed_at).toISOString()
        : null,
      createdAt: new Date(row.dead_lettered_at).toISOString(),
    }));
    const page = pageFrom(rows, query.limit);
    return json(200, {
      items: page.items.map(({ createdAt: _createdAt, ...item }) => item),
      page: page.page,
    });
  } finally {
    client.release();
  }
};

export const replayDeadLetters: ApiHandler = async (request) => {
  const body = await parseJson(request, replayDeadLetterRequestSchema);
  const key = idempotencyKeyFrom(request);
  const correlationId =
    request.headers.get("x-correlation-id") ?? randomUUID();
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["platform"]);
  } finally {
    authClient.release();
  }
  const result = await idempotentTransaction(
    "admin.dead-letters.replay",
    key,
    actor,
    body,
    async (client) => {
      const replayed = await client.query(
        `WITH selected AS (
           SELECT *
           FROM dead_letter_messages
           WHERE id = ANY($1::uuid[]) AND replayed_at IS NULL
           FOR UPDATE
         ),
         queued AS (
           INSERT INTO outbox (
             topic, event_type, aggregate_id, correlation_id, causation_id, payload
           )
           SELECT
             topic,
             event_type,
             aggregate_id,
             $2,
             original_message_id,
             payload
           FROM selected
           RETURNING causation_id
         )
         UPDATE dead_letter_messages AS dead_letter
         SET replayed_at = now()
         FROM queued
         WHERE dead_letter.original_message_id = queued.causation_id
         RETURNING dead_letter.id`,
        [body.messageIds, correlationId],
      );
      return {
        status: 202,
        body: {
          replayed: replayed.rowCount ?? 0,
          skipped: body.messageIds.length - (replayed.rowCount ?? 0),
        },
      };
    },
  );
  return json(result.status, result.body, correlationId);
};
