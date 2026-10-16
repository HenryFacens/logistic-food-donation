import assert from "node:assert/strict";
import test from "node:test";
import { classificationInternals } from "../src/handlers/classification.js";

test("classification is deterministic and uses pt-BR food keywords", () => {
  const classification = classificationInternals.classify({
    id: "00000000-0000-4000-8000-000000000001",
    status: "posted",
    category: null,
    description: "Pães frescos da padaria",
    perishability_minutes: 180,
    image_url: null,
    classification: null,
    expires_at: new Date("2026-10-16T20:00:00.000Z"),
  });

  assert.equal(classification.category, "bakery");
  assert.equal(classification.source, "manual");
  assert.equal(classification.simulated, true);
  assert.equal(classification.confidence, 0.82);
});

test("existing valid classification is preserved", () => {
  const existing = {
    category: "dairy" as const,
    description: "Leite integral",
    confidence: 0.91,
    perishabilityMinutes: 120,
    source: "upload" as const,
    simulated: true,
  };
  const classification = classificationInternals.classify({
    id: "00000000-0000-4000-8000-000000000001",
    status: "posted",
    category: "dairy",
    description: "Leite integral",
    perishability_minutes: 120,
    image_url: "https://example.test/image.jpg",
    classification: existing,
    expires_at: new Date("2026-10-16T20:00:00.000Z"),
  });

  assert.deepEqual(classification, existing);
});
