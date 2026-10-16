import type { MessageBus } from "./message-bus.js";
import { MessageStore } from "./message-store.js";
import { errorMessage, retryAt } from "./retry.js";

export class OutboxRelay {
  constructor(
    private readonly bus: MessageBus,
    private readonly store: MessageStore,
    private readonly workerId: string,
    private readonly maxAttempts: number,
  ) {}

  async run(limit: number): Promise<number> {
    if (this.bus.driver === "pg") {
      return 0;
    }

    const messages = await this.store.claimOutbox(null, limit, this.workerId);
    let published = 0;
    for (const message of messages) {
      try {
        await this.bus.publish(message);
        await this.store.completeOutbox(message.id);
        published += 1;
      } catch (error) {
        const detail = errorMessage(error);
        if (message.attempt >= this.maxAttempts) {
          await this.store.deadLetterOutbox(message, detail);
        } else {
          await this.store.retryOutbox(
            message.id,
            retryAt(message.attempt),
            detail,
          );
        }
      }
    }
    return published;
  }
}
