import { describe, expect, it } from "vitest";
import {
  createDeliveryReceiptRequestSchema,
  dashboardRequestSchema,
  dashboardMetricSchema,
  driverRatingOpportunitySchema,
  roleSchema,
  sellerDashboardNotice,
  sellerDashboardSchema,
} from "../src/index.js";

const timestamp = "2026-10-17T12:00:00-03:00";
const laterTimestamp = "2026-10-17T13:00:00-03:00";
const uuid = "10000000-0000-4000-8000-000000000001";

describe("metrics contracts", () => {
  it("supports the platform role", () => {
    expect(roleSchema.parse("platform")).toBe("platform");
  });

  it("requires evidence and value to agree", () => {
    expect(
      dashboardMetricSchema.parse({
        key: "received-weight",
        label: "Kg recebidos",
        evidence: "recorded",
        value: 180,
        unit: "kg",
      }),
    ).toMatchObject({ value: 180, evidence: "recorded" });

    expect(() =>
      dashboardMetricSchema.parse({
        key: "tax-saving",
        label: "Economia fiscal",
        evidence: "unavailable",
        value: 100,
        unit: "BRL",
      }),
    ).toThrow();
  });

  it("parses dashboard boolean query values explicitly", () => {
    expect(
      dashboardRequestSchema.parse({ includeMonthlySeries: "false" })
        .includeMonthlySeries,
    ).toBe(false);
  });

  it("validates receipt condition and weights together", () => {
    expect(
      createDeliveryReceiptRequestSchema.parse({
        condition: "partial",
        receivedWeightKg: 80,
        rejectedWeightKg: 20,
        rejectionReasons: ["embalagem danificada"],
      }),
    ).toMatchObject({ condition: "partial" });

    expect(() =>
      createDeliveryReceiptRequestSchema.parse({
        condition: "rejected",
        receivedWeightKg: 10,
        rejectedWeightKg: 90,
        rejectionReasons: [],
      }),
    ).toThrow();
  });

  it("accepts seller dashboard sections and monthly series", () => {
    expect(
      sellerDashboardSchema.parse({
        sellerId: uuid,
        periodStart: timestamp,
        periodEnd: laterTimestamp,
        generatedAt: laterTimestamp,
        fiscalNotice: sellerDashboardNotice,
        simulated: true,
        simulationLabel: "SIMULADO",
        sections: [
          {
            key: "donations",
            title: "Doações",
            metrics: [
              {
                key: "published",
                label: "Quantidade publicada",
                evidence: "calculated",
                value: 180,
                unit: "kg",
              },
            ],
            monthlySeries: [
              {
                key: "published-monthly",
                label: "Kg publicados por mês",
                evidence: "calculated",
                unit: "kg",
                points: [{ month: "2026-10", value: 180 }],
              },
            ],
          },
        ],
      }).sections,
    ).toHaveLength(1);
  });

  it("represents completed rating opportunities", () => {
    expect(
      driverRatingOpportunitySchema.parse({
        pickupId: uuid,
        donationId: "10000000-0000-4000-8000-000000000002",
        donationDescription: "12 caixas de tomate",
        driverId: "10000000-0000-4000-8000-000000000003",
        driverDisplayName: "Ana Souza SIMULADO",
        reviewerRole: "seller",
        status: "completed",
        availableAt: timestamp,
        completedRating: {
          id: "10000000-0000-4000-8000-000000000004",
          pickupId: uuid,
          driverId: "10000000-0000-4000-8000-000000000003",
          reviewerUserId: "10000000-0000-4000-8000-000000000005",
          reviewerRole: "seller",
          rating: 5,
          tags: ["pontualidade"],
          comment: null,
          simulated: true,
          simulationLabel: "SIMULADO",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }).status,
    ).toBe("completed");
  });
});
