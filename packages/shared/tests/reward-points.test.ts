import { describe, expect, it } from "vitest";
import {
  COLLECTION_REWARD_POINTS,
  calculateRewardPoints,
  calculateTotalRewardPoints,
} from "../src/index.js";

describe("reward points", () => {
  it("credits a base plus one point per rounded kilogram on delivery", () => {
    expect(calculateRewardPoints(0.4)).toBe(10);
    expect(calculateRewardPoints(12)).toBe(22);
    expect(calculateRewardPoints(12.5)).toBe(23);
    expect(calculateRewardPoints(80.2)).toBe(90);
  });

  it("never rewards invalid weights beyond the base", () => {
    expect(calculateRewardPoints(Number.NaN)).toBe(10);
    expect(calculateRewardPoints(-5)).toBe(10);
  });

  it("totals the collection and delivery credits", () => {
    expect(COLLECTION_REWARD_POINTS).toBe(25);
    expect(calculateTotalRewardPoints(18)).toBe(25 + 28);
  });
});
