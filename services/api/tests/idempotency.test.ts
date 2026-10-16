import { describe, expect, it } from "vitest";
import { requestHash } from "../src/idempotency.js";

describe("idempotency request hash", () => {
  it("is stable across object key order", () => {
    expect(
      requestHash("donations.create", {
        quantity: 4,
        address: { city: "Campinas", state: "SP" },
      }),
    ).toBe(
      requestHash("donations.create", {
        address: { state: "SP", city: "Campinas" },
        quantity: 4,
      }),
    );
  });

  it("separates operation scopes", () => {
    expect(requestHash("offers.accept", { id: "1" })).not.toBe(
      requestHash("offers.decline", { id: "1" }),
    );
  });
});
