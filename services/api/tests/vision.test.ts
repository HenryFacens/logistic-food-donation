import { describe, expect, it } from "vitest";
import { deterministicClassification } from "../src/routes/vision.js";

describe("deterministic vision fallback", () => {
  it("classifies a manual bakery description in pt-BR", () => {
    const result = deterministicClassification({
      source: "manual",
      manualDescription: "Pães franceses do fim do dia",
    });
    expect(result.category).toBe("bakery");
    expect(result.simulated).toBe(true);
    expect(result.description).toContain("SIMULADO");
  });
});
