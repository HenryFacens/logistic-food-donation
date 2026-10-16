import {
  messageEnvelopeSchema,
  type MessageEnvelope,
  type QueueName,
} from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type { Database, SqlExecutor } from "../infrastructure/database.js";

interface StoredMessageRow extends QueryResultRow {
  id: string;
  topic: QueueName;
  event_type: string;
  aggregate_id: string;
  correlation_id: string;
  causation_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  created_at: Date;
}

function envelopeFromRow(row: StoredMessageRow): MessageEnvelope {
  return messageEnvelopeSchema.parse({
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
}

export class MessageStore {
  constructor(private readonly database: Database) {}

  async claimOutbox(
    topic: QueueName | null,
    limit: number,
    workerId: string,
  ): Promise<MessageEnvelope[]> {
    return this.database.transaction(async (transaction) => {
      const result = await transaction.query<StoredMessageRow>(
        `
          WITH claimable AS (
            SELECT id
            FROM outbox
            WHERE status IN ('pending', 'failed')
              AND available_at <= now()
              AND ($1::text IS NULL OR topic = $1)
            ORDER BY available_at, created_at, id
            FOR UPDATE SKIP LOCKED
            LIMIT $2
          )
          UPDATE outbox AS message
          SET status = 'processing',
              attempts = message.attempts + 1,
              locked_at = now(),
              locked_by = $3
          FROM claimable
          WHERE message.id = claimable.id
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
        [topic, limit, workerId],
      );
      return result.rows.map(envelopeFromRow);
    });
  }

  async completeOutbox(id: string): Promise<void> {
    await this.database.query(
      `
        UPDATE outbox
        SET status = 'processed',
            processed_at = now(),
            locked_at = NULL,
            locked_by = NULL,
            last_error = NULL
        WHERE id = $1
          AND status = 'processing'
      `,
      [id],
    );
  }

  async retryOutbox(
    id: string,
    availableAt: Date,
    error: string,
  ): Promise<void> {
    await this.database.query(
      `
        UPDATE outbox
        SET status = 'failed',
            available_at = $2,
            locked_at = NULL,
            locked_by = NULL,
            last_error = $3
        WHERE id = $1
          AND status = 'processing'
      `,
      [id, availableAt, error],
    );
  }

  async deadLetterOutbox(
    message: MessageEnvelope,
    error: string,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.insertDeadLetter(transaction, message, error);
      await transaction.query(
        `
          UPDATE outbox
          SET status = 'dead_letter',
              locked_at = NULL,
              locked_by = NULL,
              last_error = $2
          WHERE id = $1
        `,
        [message.id, error],
      );
    });
  }

  async recordDeadLetter(
    message: MessageEnvelope,
    error: string,
  ): Promise<void> {
    await this.database.transaction((transaction) =>
      this.insertDeadLetter(transaction, message, error),
    );
  }

  private async insertDeadLetter(
    transaction: SqlExecutor,
    message: MessageEnvelope,
    error: string,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO dead_letter_messages (
          original_message_id,
          topic,
          event_type,
          aggregate_id,
          correlation_id,
          payload,
          attempts,
          error
        )
        SELECT $1, $2, $3, $4, $5, $6::jsonb, $7, $8
        WHERE NOT EXISTS (
          SELECT 1
          FROM dead_letter_messages
          WHERE original_message_id = $1
            AND replayed_at IS NULL
        )
      `,
      [
        message.id,
        message.topic,
        message.type,
        message.aggregateId,
        message.correlationId,
        JSON.stringify(message.payload),
        message.attempt,
        error,
      ],
    );
  }
}
