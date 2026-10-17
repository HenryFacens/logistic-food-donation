import { describe, expect, it } from "vitest";
import { detectImageMediaType, toClassification } from "../src/claude-vision.js";
import { deterministicClassification } from "../src/routes/vision.js";

describe("deterministic vision fallback", () => {
  it("classifies a manual bakery description in pt-BR", () => {
    const result = deterministicClassification({
      source: "manual",
      manualDescription: "Pães franceses do fim do dia",
    });
    expect(result.category).toBe("bakery");
    expect(result.simulated).toBe(true);
    expect(result.description).not.toContain("SIMULADO");
  });
});

describe("Claude vision mapping", () => {
  const analysis = {
    isFood: true,
    category: "bakery" as const,
    description: "  Pães franceses do dia ",
    items: ["Pão francês", " "],
    suggestedQuantity: 30,
    suggestedUnit: "unit" as const,
    estimatedWeightKg: 1.537,
    condition: "good" as const,
    conditionNotes: "",
    shelfLifeHours: 400,
    confidence: 1.4,
  };

  it("clamps model values into the public contract", () => {
    const result = toClassification(
      analysis,
      { source: "camera", imageBase64: "/9j/abc" },
      "claude-sonnet-5-5",
    );
    expect(result).toMatchObject({
      category: "bakery",
      description: "Pães franceses do dia",
      items: ["Pão francês"],
      confidence: 1,
      perishabilityMinutes: 7 * 24 * 60,
      estimatedWeightKg: 1.5,
      simulated: false,
      model: "claude-sonnet-5-5",
    });
    expect(result.conditionNotes).toBeUndefined();
  });

  it("drops non-positive quantity and weight estimates", () => {
    const result = toClassification(
      { ...analysis, suggestedQuantity: 0, estimatedWeightKg: -1, shelfLifeHours: 0 },
      { source: "upload", imageBase64: "/9j/abc" },
      "claude-sonnet-5-5",
    );
    expect(result.suggestedQuantity).toBeUndefined();
    expect(result.estimatedWeightKg).toBeUndefined();
    expect(result.perishabilityMinutes).toBe(15);
  });

  it("detects supported image formats from base64 signatures", () => {
    expect(detectImageMediaType("/9j/4AAQ")).toBe("image/jpeg");
    expect(detectImageMediaType("iVBORw0KGgoAAA")).toBe("image/png");
    expect(detectImageMediaType("UklGRiQAAABXRUJQ")).toBe("image/webp");
    expect(detectImageMediaType("AAAAGGZ0eXBoZWlj")).toBeNull();
  });
});
