import {
  messageEnvelopeSchema,
  type MessageEnvelope,
  type QueueName,
} from "@resgata/shared";
import {
  ServiceBusClient,
  type ServiceBusReceiver,
  type ServiceBusSender,
} from "@azure/service-bus";
import type { Scheduler } from "../scheduling/scheduler.js";
import type {
  MessageBus,
  ReceivedMessage,
} from "./message-bus.js";
import { MessageStore } from "./message-store.js";

export class ServiceBusMessageBus implements MessageBus {
  readonly driver = "servicebus" as const;
  private readonly client: ServiceBusClient;
  private readonly senders = new Map<QueueName, ServiceBusSender>();
  private readonly receivers = new Map<QueueName, ServiceBusReceiver>();

  constructor(
    connectionString: string,
    private readonly scheduler: Scheduler,
    private readonly store: MessageStore,
  ) {
    this.client = new ServiceBusClient(connectionString);
  }

  async publish(message: MessageEnvelope): Promise<void> {
    let sender = this.senders.get(message.topic);
    if (!sender) {
      sender = this.client.createSender(message.topic);
      this.senders.set(message.topic, sender);
    }
    await sender.sendMessages({
      body: message,
      messageId: message.id,
      correlationId: message.correlationId,
      contentType: "application/json",
      applicationProperties: {
        eventType: message.type,
        aggregateId: message.aggregateId,
        attempt: message.attempt,
      },
    });
  }

  async receive(topic: QueueName, limit: number): Promise<ReceivedMessage[]> {
    let receiver = this.receivers.get(topic);
    if (!receiver) {
      receiver = this.client.createReceiver(topic, { receiveMode: "peekLock" });
      this.receivers.set(topic, receiver);
    }

    const deliveries = await receiver.receiveMessages(limit, {
      maxWaitTimeInMs: 500,
    });
    return deliveries.map((delivery) => {
      const parsed = messageEnvelopeSchema.parse(delivery.body);
      const envelope = {
        ...parsed,
        attempt: Math.max(parsed.attempt, delivery.deliveryCount ?? 1),
      };
      return {
        envelope,
        complete: () => receiver.completeMessage(delivery),
        retry: async (availableAt, error) => {
          await this.scheduler.schedule(
            { ...envelope, attempt: envelope.attempt + 1 },
            availableAt,
            error,
          );
          await receiver.completeMessage(delivery);
        },
        deadLetter: async (error) => {
          await this.store.recordDeadLetter(envelope, error);
          await receiver.deadLetterMessage(delivery, {
            deadLetterReason: "max_delivery_attempts",
            deadLetterErrorDescription: error,
          });
        },
      };
    });
  }

  async health(): Promise<boolean> {
    try {
      const sender = this.client.createSender("donation.created");
      await sender.close();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await Promise.all([
      ...Array.from(this.senders.values(), (sender) => sender.close()),
      ...Array.from(this.receivers.values(), (receiver) => receiver.close()),
    ]);
    await this.client.close();
  }
}
