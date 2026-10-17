import assert from "node:assert/strict";
import test from "node:test";
import { matchingInternals } from "../src/handlers/matching.js";

test("matching ranks eligible NGOs by the shared score", () => {
  const ranked = matchingInternals.rankCandidates(
    {
      category: "bakery",
      estimated_weight_kg: "20",
      perishability_minutes: 240,
    },
    [
      {
        id: "22000000-0000-4000-8000-000000000001",
        distance_km: "8",
        remaining_capacity_kg: "100",
        service_radius_km: "20",
        accepted_categories: ["bakery"],
        category_need: "0.7",
      },
      {
        id: "22000000-0000-4000-8000-000000000002",
        distance_km: "2",
        remaining_capacity_kg: "100",
        service_radius_km: "20",
        accepted_categories: ["bakery"],
        category_need: "1",
      },
      {
        id: "22000000-0000-4000-8000-000000000003",
        distance_km: "1",
        remaining_capacity_kg: "5",
        service_radius_km: "20",
        accepted_categories: ["bakery"],
        category_need: "1",
      },
    ],
  );

  assert.equal(ranked[0]?.ngoId, "22000000-0000-4000-8000-000000000002");
  assert.equal(ranked[0]?.score.eligible, true);
  assert.equal(ranked[2]?.score.eligible, false);
  assert.ok(
    ranked[2]?.score.rejectionReasons.includes("insufficient_capacity"),
  );
});

const ngo = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  distance_km: "3",
  remaining_capacity_kg: "100",
  service_radius_km: "20",
  accepted_categories: ["bakery" as const],
  category_need: "0.5",
  receiving_start_min: 8 * 60,
  receiving_end_min: 20 * 60,
  ...overrides,
});
const bread = {
  category: "bakery" as const,
  estimated_weight_kg: "10",
  perishability_minutes: 240,
};

const breadRequest = (fit: number) => ({
  needId: "40000000-0000-4000-8000-000000000001",
  item: "Pão francês",
  fit,
  coveredQuantity: 25,
  unit: "unit" as const,
  remainingQuantity: 60,
  reason: "Pão francês do dia atende o pedido.",
  source: "claude" as const,
});

test("a matching request outranks the static category profile", () => {
  const ranked = matchingInternals.rankCandidates(
    bread,
    [
      ngo("22000000-0000-4000-8000-00000000000a", { category_need: "1" }),
      ngo("22000000-0000-4000-8000-00000000000b"),
    ],
    { needMatches: new Map([["22000000-0000-4000-8000-00000000000b", breadRequest(0.95)]]) },
  );
  assert.equal(ranked[0]?.ngoId, "22000000-0000-4000-8000-00000000000b");
  assert.equal(ranked[0]?.score.needMatch?.item, "Pão francês");
  assert.equal(ranked[1]?.score.needMatch, undefined);
  assert.equal(matchingInternals.needSignal(undefined, 1), 0.5);
  assert.equal(matchingInternals.needSignal(breadRequest(0.2), 1), 0.2);
});

test("NGOs closed until after the food spoils are rejected", () => {
  // 21:00 now, window 08:00-20:00: next opening is 11h away, food lasts 4h.
  const ranked = matchingInternals.rankCandidates(bread, [ngo("22000000-0000-4000-8000-00000000000c")], {
    nowMinuteOfDay: 21 * 60,
  });
  assert.equal(ranked[0]?.score.eligible, false);
  assert.ok(ranked[0]?.score.rejectionReasons.includes("outside_receiving_hours"));
  assert.equal(matchingInternals.minutesUntilReceiving(7 * 60, 480, 1200), 60);
  assert.equal(matchingInternals.minutesUntilReceiving(21 * 60, 480, 1200), 660);
  assert.equal(matchingInternals.minutesUntilReceiving(9 * 60, 480, 1200), 0);
});

test("road routes replace straight-line estimates", () => {
  const id = "22000000-0000-4000-8000-00000000000d";
  const ranked = matchingInternals.rankCandidates(bread, [ngo(id)], {
    roadRoutes: new Map([[id, { distanceKm: 7.5, etaMinutes: 300 }]]),
  });
  assert.equal(ranked[0]?.score.components.distance.raw, 7.5);
  assert.ok(ranked[0]?.score.rejectionReasons.includes("eta_exceeds_perishability"));
});

test("food needing attention weighs distance more", () => {
  const near = "22000000-0000-4000-8000-00000000000e";
  const needy = "22000000-0000-4000-8000-00000000000f";
  const rows = [
    ngo(near, { distance_km: "1", category_need: "0" }),
    ngo(needy, { distance_km: "15" }),
  ];
  const needMatches = new Map([[needy, breadRequest(1)]]);
  assert.equal(matchingInternals.rankCandidates(bread, rows, { needMatches })[0]?.ngoId, needy);
  assert.equal(
    matchingInternals.rankCandidates({ ...bread, condition: "attention" }, rows, { needMatches })[0]
      ?.ngoId,
    near,
  );
});
