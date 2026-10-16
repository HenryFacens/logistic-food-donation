import type { MessageEnvelope, QueueName } from "@resgata/shared";
import type { Database } from "../infrastructure/database.js";
import type {
  MessageBus,
  ReceivedMessage,
} from "./message-bus.js";
import { MessageStore } from "./message-store.js";

export class PostgresMessageBus implements MessageBus {
  readonly driver = "pg" as const;
  private readonly store: MessageStore;

  constructor(
    private readonly database: Database,
    private readonly workerId: string,
  ) {
    this.store = new MessageStore(database);
  }

  async publish(message: MessageEnvelope): Promise<void> {
    await this.database.query(
      `
        INSERT INTO outbox (
          id,
          topic,
          event_type,
          aggregate_id,
          correlation_id,
          causation_id,
          payload,
          status,
          attempts,
          available_at,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb,
          'pending', GREATEST($8 - 1, 0), now(), $9
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        message.id,
        message.topic,
        message.type,
        message.aggregateId,
        message.correlationId,
        message.causationId,
        JSON.stringify(message.payload),
        message.attempt,
        message.occurredAt,
      ],
    );
  }

  async receive(topic: QueueName, limit: number): Promise<ReceivedMessage[]> {
    const messages = await this.store.claimOutbox(
      topic,
      limit,
      this.workerId,
    );
    return messages.map((envelope) => ({
      envelope,
      complete: () => this.store.completeOutbox(envelope.id),
      retry: (availableAt, error) =>
        this.store.retryOutbox(envelope.id, availableAt, error),
      deadLetter: (error) =>
        this.store.deadLetterOutbox(envelope, error),
    }));
  }

  async health(): Promise<boolean> {
    try {
      await this.database.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {}
}
