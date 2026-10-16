import { describe, expect, it } from "vitest";
import {
  InvalidDonationTransitionError,
  allowedDonationTransitions,
  assertDonationTransition,
  canTransitionDonation,
  isTerminalDonationStatus,
} from "../src/index.js";

describe("donation state machine", () => {
  it("supports the complete happy path", () => {
    const path = [
      "posted",
      "classified",
      "offered",
      "accepted",
      "collected",
      "delivered",
    ] as const;

    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransitionDonation(path[index]!, path[index + 1]!)).toBe(true);
    }
  });

  it("keeps terminal states terminal", () => {
    for (const status of ["delivered", "expired", "no_destination"] as const) {
      expect(isTerminalDonationStatus(status)).toBe(true);
      expect(allowedDonationTransitions(status)).toEqual([]);
    }
  });

  it("rejects skips and regressions", () => {
    expect(canTransitionDonation("posted", "accepted")).toBe(false);
    expect(canTransitionDonation("collected", "accepted")).toBe(false);
    expect(() => assertDonationTransition("offered", "delivered")).toThrow(
      InvalidDonationTransitionError,
    );
  });
});
