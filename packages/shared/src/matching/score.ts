import type { MatchingScore } from "../schemas/offers.js";

export interface MatchingWeights {
  readonly distance: number;
  readonly capacity: number;
  readonly perishability: number;
  readonly categoryNeed: number;
}

export interface MatchingScoreInput {
  readonly distanceKm: number;
  readonly maxDistanceKm: number;
  readonly ngoRemainingCapacityKg: number;
  readonly donationWeightKg: number;
  readonly perishabilityMinutes: number;
  readonly etaMinutes: number;
  readonly categoryNeed: number;
  readonly acceptsCategory?: boolean;
  readonly weights?: MatchingWeights;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  distance: 0.35,
  capacity: 0.25,
  perishability: 0.25,
  categoryNeed: 0.15,
};

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number, precision = 4): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function validateWeights(weights: MatchingWeights): void {
  const values = Object.values(weights);
  if (values.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError("Matching weights must be finite and non-negative");
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 1e-9) {
    throw new RangeError("Matching weights must sum to 1");
  }
}

export function calculateMatchingScore(
  input: MatchingScoreInput,
): MatchingScore {
  const weights = input.weights ?? DEFAULT_MATCHING_WEIGHTS;
  validateWeights(weights);

  if (
    input.distanceKm < 0 ||
    input.maxDistanceKm <= 0 ||
    input.ngoRemainingCapacityKg < 0 ||
    input.donationWeightKg <= 0 ||
    input.perishabilityMinutes <= 0 ||
    input.etaMinutes < 0 ||
    input.categoryNeed < 0 ||
    input.categoryNeed > 1
  ) {
    throw new RangeError("Matching input contains an invalid value");
  }

  const normalized = {
    distance: clampUnit(1 - input.distanceKm / input.maxDistanceKm),
    capacity: clampUnit(
      input.ngoRemainingCapacityKg / input.donationWeightKg,
    ),
    perishability: clampUnit(
      (input.perishabilityMinutes - input.etaMinutes) /
        input.perishabilityMinutes,
    ),
    categoryNeed: clampUnit(input.categoryNeed),
  };

  const rejectionReasons: string[] = [];
  if (input.acceptsCategory === false) {
    rejectionReasons.push("category_not_accepted");
  }
  if (input.distanceKm > input.maxDistanceKm) {
    rejectionReasons.push("outside_service_radius");
  }
  if (input.ngoRemainingCapacityKg < input.donationWeightKg) {
    rejectionReasons.push("insufficient_capacity");
  }
  if (input.etaMinutes >= input.perishabilityMinutes) {
    rejectionReasons.push("eta_exceeds_perishability");
  }

  const component = (
    raw: number,
    normalizedValue: number,
    weight: number,
  ) => ({
    raw: round(raw),
    normalized: round(normalizedValue),
    weight,
    contribution: round(normalizedValue * weight * 100),
  });

  const components = {
    distance: component(input.distanceKm, normalized.distance, weights.distance),
    capacity: component(
      input.ngoRemainingCapacityKg,
      normalized.capacity,
      weights.capacity,
    ),
    perishability: component(
      input.etaMinutes,
      normalized.perishability,
      weights.perishability,
    ),
    categoryNeed: component(
      input.categoryNeed,
      normalized.categoryNeed,
      weights.categoryNeed,
    ),
  };

  const total = Object.values(components).reduce(
    (sum, item) => sum + item.contribution,
    0,
  );

  return {
    total: round(total, 2),
    eligible: rejectionReasons.length === 0,
    rejectionReasons,
    components,
  };
}
