import assert from "node:assert/strict";
import test from "node:test";
import type { MessageEnvelope } from "@resgata/shared";
import type { QueryResultRow } from "pg";
import type {
  Database,
  SqlExecutor,
} from "../src/infrastructure/database.js";
import { IdempotentConsumer } from "../src/messaging/idempotent-consumer.js";

class FakeDatabase implements Database {
  private inserted = false;

  async query<Row extends QueryResultRow = QueryResultRow>() {
    return { rows: [] as Row[], rowCount: 0 };
  }

  async transaction<T>(
    work: (transaction: SqlExecutor) => Promise<T>,
  ): Promise<T> {
    return work({
      query: async <Row extends QueryResultRow = QueryResultRow>() => {
        if (this.inserted) {
          return { rows: [] as Row[], rowCount: 0 };
        }
        this.inserted = true;
        return {
          rows: [
            { message_id: "00000000-0000-4000-8000-000000000001" },
          ] as unknown as Row[],
          rowCount: 1,
        };
      },
    });
  }

  async close(): Promise<void> {}
}

const message: MessageEnvelope = {
  id: "00000000-0000-4000-8000-000000000001",
  topic: "donation.created",
  type: "donation.created",
  aggregateId: "00000000-0000-4000-8000-000000000002",
  correlationId: "correlation-test",
  causationId: null,
  occurredAt: "2026-10-16T12:00:00.000Z",
  attempt: 1,
  payload: {},
};

test("idempotent consumer runs side effects once per consumer and message", async () => {
  const database = new FakeDatabase();
  let calls = 0;
  const consumer = new IdempotentConsumer(
    database,
    "test-consumer",
    async () => {
      calls += 1;
    },
  );

  assert.equal(await consumer.handle(message), "processed");
  assert.equal(await consumer.handle(message), "duplicate");
  assert.equal(calls, 1);
});
