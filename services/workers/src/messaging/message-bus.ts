import type { MessageEnvelope, QueueName } from "@resgata/shared";

export interface ReceivedMessage {
  envelope: MessageEnvelope;
  complete(): Promise<void>;
  retry(availableAt: Date, error: string): Promise<void>;
  deadLetter(error: string): Promise<void>;
}

export interface MessageBus {
  readonly driver: "servicebus" | "pg";
  publish(message: MessageEnvelope): Promise<void>;
  receive(topic: QueueName, limit: number): Promise<ReceivedMessage[]>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}
