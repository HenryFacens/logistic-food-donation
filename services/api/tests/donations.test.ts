import { describe, expect, it } from "vitest";
import { assertDonatable } from "../src/routes/donations.js";

const base = {
  category: "bakery" as const,
  description: "Pães",
  confidence: 0.9,
  perishabilityMinutes: 240,
  source: "camera" as const,
  simulated: false,
};

describe("server-side donation safety guard", () => {
  it("rejects food the photo analysis marked unsafe", () => {
    expect(() => assertDonatable({ ...base, condition: "unsafe" })).toThrow(
      /não está seguro/,
    );
  });

  it("rejects photos without food", () => {
    expect(() => assertDonatable({ ...base, isFood: false })).toThrow(
      /não mostra alimentos/,
    );
  });

  it("accepts good, attention, and manual donations", () => {
    expect(() => assertDonatable({ ...base, condition: "good" })).not.toThrow();
    expect(() => assertDonatable({ ...base, condition: "attention" })).not.toThrow();
    expect(() => assertDonatable(undefined)).not.toThrow();
  });
});
