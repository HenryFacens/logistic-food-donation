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
