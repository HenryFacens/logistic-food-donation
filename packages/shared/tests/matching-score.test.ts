import { describe, expect, it } from "vitest";
import { calculateMatchingScore } from "../src/index.js";

describe("explainable matching score", () => {
  it("returns a weighted score with a complete breakdown", () => {
    const result = calculateMatchingScore({
      distanceKm: 5,
      maxDistanceKm: 20,
      ngoRemainingCapacityKg: 40,
      donationWeightKg: 20,
      perishabilityMinutes: 120,
      etaMinutes: 30,
      categoryNeed: 0.8,
      acceptsCategory: true,
    });

    expect(result).toEqual({
      total: 82,
      eligible: true,
      rejectionReasons: [],
      components: {
        distance: {
          raw: 5,
          normalized: 0.75,
          weight: 0.35,
          contribution: 26.25,
        },
        capacity: {
          raw: 40,
          normalized: 1,
          weight: 0.25,
          contribution: 25,
        },
        perishability: {
          raw: 30,
          normalized: 0.75,
          weight: 0.25,
          contribution: 18.75,
        },
        categoryNeed: {
          raw: 0.8,
          normalized: 0.8,
          weight: 0.15,
          contribution: 12,
        },
      },
    });
  });

  it("explains every hard eligibility failure", () => {
    const result = calculateMatchingScore({
      distanceKm: 25,
      maxDistanceKm: 20,
      ngoRemainingCapacityKg: 5,
      donationWeightKg: 20,
      perishabilityMinutes: 30,
      etaMinutes: 30,
      categoryNeed: 0.2,
      acceptsCategory: false,
    });

    expect(result.eligible).toBe(false);
    expect(result.rejectionReasons).toEqual([
      "category_not_accepted",
      "outside_service_radius",
      "insufficient_capacity",
      "eta_exceeds_perishability",
    ]);
  });

  it("rejects weights that do not sum to one", () => {
    expect(() =>
      calculateMatchingScore({
        distanceKm: 1,
        maxDistanceKm: 10,
        ngoRemainingCapacityKg: 10,
        donationWeightKg: 5,
        perishabilityMinutes: 60,
        etaMinutes: 10,
        categoryNeed: 1,
        weights: {
          distance: 1,
          capacity: 1,
          perishability: 1,
          categoryNeed: 1,
        },
      }),
    ).toThrow("Matching weights must sum to 1");
  });
});
