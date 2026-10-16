import assert from "node:assert/strict";
import test from "node:test";
import { retryAt, retryDelayMs } from "../src/messaging/retry.js";

test("retry delay applies capped exponential backoff", () => {
  assert.equal(retryDelayMs(1), 1_000);
  assert.equal(retryDelayMs(4), 8_000);
  assert.equal(retryDelayMs(20), 300_000);
});

test("retry timestamp is deterministic for a supplied clock", () => {
  const now = new Date("2026-10-16T12:00:00.000Z");
  assert.equal(
    retryAt(3, now).toISOString(),
    "2026-10-16T12:00:04.000Z",
  );
});
