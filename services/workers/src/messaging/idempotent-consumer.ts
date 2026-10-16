import type { MessageEnvelope } from "@resgata/shared";
import type {
  Database,
  SqlExecutor,
} from "../infrastructure/database.js";

export type TransactionalHandler = (
  message: MessageEnvelope,
  transaction: SqlExecutor,
) => Promise<void>;

export class IdempotentConsumer {
  constructor(
    private readonly database: Database,
    private readonly consumerName: string,
    private readonly handler: TransactionalHandler,
  ) {}

  async handle(message: MessageEnvelope): Promise<"processed" | "duplicate"> {
    return this.database.transaction(async (transaction) => {
      const marker = await transaction.query(
        `
          INSERT INTO processed_messages (
            consumer_name,
            message_id,
            correlation_id
          ) VALUES ($1, $2, $3)
          ON CONFLICT (consumer_name, message_id) DO NOTHING
          RETURNING message_id
        `,
        [this.consumerName, message.id, message.correlationId],
      );
      if (marker.rowCount === 0) {
        return "duplicate";
      }
      await this.handler(message, transaction);
      return "processed";
    });
  }
}
