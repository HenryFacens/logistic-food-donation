/** Points credited when the driver confirms collection at the seller. */
export const COLLECTION_REWARD_POINTS = 25;

/** Base points credited on delivery, before the per-kilogram share. */
export const DELIVERY_BASE_REWARD_POINTS = 10;

const normalizeWeight = (weightKg: number) =>
  Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0;

/**
 * Points credited when the driver confirms delivery at the NGO: a fixed base
 * plus one point per rounded kilogram, so heavier routes are worth more.
 */
export const calculateRewardPoints = (weightKg: number): number =>
  DELIVERY_BASE_REWARD_POINTS + Math.round(normalizeWeight(weightKg));

/** Everything a driver earns for completing a pickup (collection + delivery). */
export const calculateTotalRewardPoints = (weightKg: number): number =>
  COLLECTION_REWARD_POINTS + calculateRewardPoints(weightKg);
