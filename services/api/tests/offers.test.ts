import { describe, expect, it } from "vitest";
import { comparableCoverage } from "../src/routes/offers.js";

describe("request coverage on acceptance", () => {
  const bread = { quantity: 25, unit: "unit", weightKg: 1.3 };

  it("counts units against a unit request, capped at what is missing", () => {
    expect(comparableCoverage(bread, { remaining: 60, unit: "unit" })).toBe(25);
    expect(comparableCoverage(bread, { remaining: 10, unit: "unit" })).toBe(10);
  });

  it("uses the weight for kg requests and gives up across counts", () => {
    expect(comparableCoverage(bread, { remaining: 20, unit: "kg" })).toBe(1.3);
    expect(comparableCoverage(bread, { remaining: 4, unit: "box" })).toBeNull();
  });
});
