import { calculateTotalRewardPoints } from "@resgata/shared";
import { describe, expect, it } from "vitest";
import { mapPickup } from "../src/mappers.js";

const address = {
  line1: "Rua Coronel Quirino, 900",
  district: "Cambuí",
  city: "Campinas",
  state: "SP",
  postalCode: "13025-001",
  location: { latitude: -22.8974, longitude: -47.051 },
};

const row = {
  id: "33000000-0000-4000-8000-000000000101",
  donation_id: "30000000-0000-4000-8000-000000000101",
  ngo_id: "22000000-0000-4000-8000-000000000002",
  driver_id: null,
  status: "awaiting_driver",
  pickup_code: "123456",
  delivery_code: "654321",
  pickup_latitude: -22.8974,
  pickup_longitude: -47.051,
  delivery_latitude: -22.9008,
  delivery_longitude: -47.0606,
  assigned_at: null,
  collected_at: null,
  delivered_at: null,
  created_at: new Date("2026-10-16T12:00:00Z"),
  updated_at: new Date("2026-10-16T12:00:00Z"),
};

const summaryColumns = {
  summary_category: "bakery",
  summary_description: "Pães do dia SIMULADO",
  summary_weight_kg: "18.40",
  summary_quantity: "18.40",
  summary_unit: "kg",
  summary_expires_at: new Date("2026-10-16T14:00:00Z"),
  summary_pickup_address: address,
  summary_seller_name: "Padaria Cambuí SIMULADO",
  summary_ngo_name: "Instituto Prato Solidário SIMULADO",
  summary_delivery_address: { ...address, district: "Centro" },
  summary_route_distance_km: "1.0487",
  summary_distance_to_pickup_km: null,
};

describe("pickup mapper", () => {
  it("keeps proof codes for sellers and NGOs by default", () => {
    const pickup = mapPickup(row);
    expect(pickup.pickupCode).toBe("123456");
    expect(pickup.deliveryCode).toBe("654321");
    expect(pickup.summary).toBeUndefined();
  });

  it("omits proof codes for drivers", () => {
    const pickup = mapPickup(row, { includeCodes: false });
    expect(pickup).not.toHaveProperty("pickupCode");
    expect(pickup).not.toHaveProperty("deliveryCode");
  });

  it("maps the decision summary with the credited reward rule", () => {
    const pickup = mapPickup({ ...row, ...summaryColumns });
    expect(pickup.summary).toMatchObject({
      estimatedWeightKg: 18.4,
      routeDistanceKm: 1,
      distanceToPickupKm: null,
      rewardPoints: calculateTotalRewardPoints(18.4),
      sellerName: "Padaria Cambuí SIMULADO",
    });
  });
});
