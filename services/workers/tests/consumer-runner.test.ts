import assert from "node:assert/strict";
import test from "node:test";
import type { MessageEnvelope } from "@resgata/shared";
import { ConsumerRunner } from "../src/messaging/consumer-runner.js";
import type {
  MessageBus,
  ReceivedMessage,
} from "../src/messaging/message-bus.js";

function envelope(attempt: number): MessageEnvelope {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    topic: "donation.created",
    type: "donation.created",
    aggregateId: "00000000-0000-4000-8000-000000000002",
    correlationId: "correlation-test",
    causationId: null,
    occurredAt: "2026-10-16T12:00:00.000Z",
    attempt,
    payload: {},
  };
}

class OneMessageBus implements MessageBus {
  readonly driver = "pg" as const;
  completed = 0;
  retried = 0;
  deadLettered = 0;

  constructor(private readonly message: MessageEnvelope) {}

  async publish(): Promise<void> {}

  async receive(): Promise<ReceivedMessage[]> {
    return [
      {
        envelope: this.message,
        complete: async () => {
          this.completed += 1;
        },
        retry: async () => {
          this.retried += 1;
        },
        deadLetter: async () => {
          this.deadLettered += 1;
        },
      },
    ];
  }

  async health(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {}
}

test("consumer retries failed messages before the delivery limit", async () => {
  const bus = new OneMessageBus(envelope(2));
  const runner = new ConsumerRunner(
    bus,
    new Map([
      [
        "donation.created",
        {
          handle: async () => {
            throw new Error("temporary");
          },
        },
      ],
    ]),
    3,
  );

  assert.equal(await runner.run("donation.created", 1), 0);
  assert.equal(bus.retried, 1);
  assert.equal(bus.deadLettered, 0);
});

test("consumer dead-letters failures at the delivery limit", async () => {
  const bus = new OneMessageBus(envelope(3));
  const runner = new ConsumerRunner(
    bus,
    new Map([
      [
        "donation.created",
        {
          handle: async () => {
            throw new Error("permanent");
          },
        },
      ],
    ]),
    3,
  );

  await runner.run("donation.created", 1);
  assert.equal(bus.retried, 0);
  assert.equal(bus.deadLettered, 1);
});
