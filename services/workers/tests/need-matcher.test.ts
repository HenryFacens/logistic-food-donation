import assert from "node:assert/strict";
import test from "node:test";
import {
  FallbackNeedMatcher,
  RuleNeedMatcher,
  comparableCoverage,
  type DonationForMatching,
  type NeedMatcher,
  type OpenNeed,
} from "../src/matching/need-matcher.js";

const donation: DonationForMatching = {
  description: "Pães franceses do dia",
  category: "bakery",
  quantity: 25,
  unit: "unit",
  weightKg: 1.3,
  shelfLifeMinutes: 1440,
};
const need = (overrides: Partial<OpenNeed>): OpenNeed => ({
  id: "40000000-0000-4000-8000-000000000001",
  ngoId: "22000000-0000-4000-8000-000000000001",
  category: "bakery",
  item: "Pão francês",
  remainingQuantity: 60,
  unit: "unit",
  neededBy: new Date("2026-10-20T20:00:00Z"),
  notes: null,
  ...overrides,
});

test("rules reward the same item and count comparable coverage", async () => {
  const [sameItem, otherItem, otherCategory] = await new RuleNeedMatcher().match(donation, [
    need({}),
    need({ id: "40000000-0000-4000-8000-000000000002", item: "Bolo de chocolate" }),
    need({ id: "40000000-0000-4000-8000-000000000003", category: "dairy", item: "Leite" }),
  ]);
  assert.equal(sameItem?.coveredQuantity, 25);
  assert.ok(sameItem!.fit > otherItem!.fit);
  assert.equal(otherCategory?.fit, 0);
});

test("coverage converts to kg requests and is unknown across counts", () => {
  assert.equal(comparableCoverage(donation, { remainingQuantity: 10, unit: "kg" }), 1.3);
  assert.equal(comparableCoverage(donation, { remainingQuantity: 10, unit: "unit" }), 10);
  assert.equal(comparableCoverage(donation, { remainingQuantity: 4, unit: "box" }), null);
});

test("fallback keeps rule results when Claude fails or skips a request", async () => {
  const failing: NeedMatcher = { match: async () => { throw new Error("offline"); } };
  const fits = await new FallbackNeedMatcher(failing).match(donation, [need({})]);
  assert.equal(fits[0]?.source, "rules");

  const partial: NeedMatcher = {
    match: async () => [
      { needId: "40000000-0000-4000-8000-000000000001", fit: 0.97, coveredQuantity: 25, reason: "ok", source: "claude" },
    ],
  };
  const mixed = await new FallbackNeedMatcher(partial).match(donation, [
    need({}),
    need({ id: "40000000-0000-4000-8000-000000000002", item: "Bolo" }),
  ]);
  assert.deepEqual(mixed.map((fit) => fit.source), ["claude", "rules"]);
});
