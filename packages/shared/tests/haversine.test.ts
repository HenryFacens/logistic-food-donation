import { describe, expect, it } from "vitest";
import { estimateEtaMinutes, haversineKm } from "../src/index.js";

describe("haversine", () => {
  it("returns zero for the same point", () => {
    const campinas = { latitude: -22.9056, longitude: -47.0608 };
    expect(haversineKm(campinas, campinas)).toBe(0);
  });

  it("calculates a stable Campinas urban distance", () => {
    const center = { latitude: -22.9056, longitude: -47.0608 };
    const baraoGeraldo = { latitude: -22.8178, longitude: -47.0692 };
    expect(haversineKm(center, baraoGeraldo)).toBeCloseTo(9.8, 1);
  });

  it("estimates travel plus handling time", () => {
    expect(estimateEtaMinutes(10, 30, 10)).toBe(30);
  });
});
