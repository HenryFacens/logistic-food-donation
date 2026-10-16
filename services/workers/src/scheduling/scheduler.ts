import {
  messageEnvelopeSchema,
  type MessageEnvelope,
} from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type { Database } from "../infrastructure/database.js";
import type { MessageBus } from "../messaging/message-bus.js";

interface ScheduledRow extends QueryResultRow {
  id: string;
  topic: MessageEnvelope["topic"];
  event_type: string;
  aggregate_id: string;
  correlation_id: string;
  causation_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  created_at: Date;
}

export interface Scheduler {
  schedule(
    message: MessageEnvelope,
    scheduledFor: Date,
    lastError?: string,
  ): Promise<void>;
  releaseDue(bus: MessageBus, limit: number): Promise<number>;
}

export class PostgresScheduler implements Scheduler {
  constructor(private readonly database: Database) {}

  async schedule(
    message: MessageEnvelope,
    scheduledFor: Date,
    lastError?: string,
  ): Promise<void> {
    await this.database.query(
      `
        INSERT INTO jobs (
          id,
          topic,
          event_type,
          aggregate_id,
          correlation_id,
          causation_id,
          payload,
          run_at,
          status,
          attempts,
          last_error,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8,
          'scheduled', GREATEST($9 - 1, 0), $10, $11
        )
        ON CONFLICT (id) DO UPDATE
        SET run_at = EXCLUDED.run_at,
            status = 'scheduled',
            attempts = EXCLUDED.attempts,
            last_error = EXCLUDED.last_error,
            payload = EXCLUDED.payload
      `,
      [
        message.id,
        message.topic,
        message.type,
        message.aggregateId,
        message.correlationId,
        message.causationId,
        JSON.stringify(message.payload),
        scheduledFor,
        message.attempt,
        lastError ?? null,
        message.occurredAt,
      ],
    );
  }

  async releaseDue(bus: MessageBus, limit: number): Promise<number> {
    const rows = await this.database.transaction(async (transaction) => {
      const claimed = await transaction.query<ScheduledRow>(
        `
          WITH due AS (
            SELECT id
            FROM jobs
            WHERE status = 'scheduled'
              AND run_at <= now()
            ORDER BY run_at, id
            FOR UPDATE SKIP LOCKED
            LIMIT $1
          )
          UPDATE jobs AS message
          SET status = 'processing',
              attempts = message.attempts + 1
          FROM due
          WHERE message.id = due.id
          RETURNING
            message.id,
            message.topic,
            message.event_type,
            message.aggregate_id,
            message.correlation_id,
            message.causation_id,
            message.payload,
            message.attempts,
            message.created_at
        `,
        [limit],
      );
      return claimed.rows;
    });

    let released = 0;
    for (const row of rows) {
      const message = messageEnvelopeSchema.parse({
        id: row.id,
        topic: row.topic,
        type: row.event_type,
        aggregateId: row.aggregate_id,
        correlationId: row.correlation_id,
        causationId: row.causation_id,
        occurredAt: row.created_at.toISOString(),
        attempt: row.attempts,
        payload: row.payload,
      });
      try {
        await bus.publish(message);
        await this.database.query(
          `
            UPDATE jobs
            SET status = 'processed',
                last_error = NULL
            WHERE id = $1
              AND status = 'processing'
          `,
          [message.id],
        );
        released += 1;
      } catch (error) {
        await this.database.query(
          `
            UPDATE jobs
            SET status = 'scheduled',
                run_at = now() + interval '5 seconds',
                last_error = $2
            WHERE id = $1
              AND status = 'processing'
          `,
          [
            message.id,
            error instanceof Error ? error.message : String(error),
          ],
        );
      }
    }
    return released;
  }
}
