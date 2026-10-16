import type { QueueName } from "@resgata/shared";
import type { MessageBus } from "./message-bus.js";
import { errorMessage, retryAt } from "./retry.js";

export interface MessageHandler {
  handle(message: import("@resgata/shared").MessageEnvelope): Promise<unknown>;
}

export class ConsumerRunner {
  constructor(
    private readonly bus: MessageBus,
    private readonly handlers: ReadonlyMap<QueueName, MessageHandler>,
    private readonly maxAttempts: number,
  ) {}

  async run(topic: QueueName, limit: number): Promise<number> {
    const handler = this.handlers.get(topic);
    if (!handler) {
      throw new Error(`No handler registered for ${topic}`);
    }

    const deliveries = await this.bus.receive(topic, limit);
    let completed = 0;
    for (const delivery of deliveries) {
      try {
        await handler.handle(delivery.envelope);
        await delivery.complete();
        completed += 1;
      } catch (error) {
        const detail = errorMessage(error);
        if (delivery.envelope.attempt >= this.maxAttempts) {
          await delivery.deadLetter(detail);
        } else {
          await delivery.retry(
            retryAt(delivery.envelope.attempt),
            detail,
          );
        }
      }
    }
    return completed;
  }
}
