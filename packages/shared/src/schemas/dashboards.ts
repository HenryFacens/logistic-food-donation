import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  simulatedSchema,
  uuidSchema,
} from "./common.js";
import { donationCategorySchema } from "./donations.js";

export const metricEvidenceSchema = z.enum([
  "recorded",
  "calculated",
  "estimated",
  "unavailable",
]);
export type MetricEvidence = z.infer<typeof metricEvidenceSchema>;

export const dashboardMetricSchema = z
  .object({
    key: nonEmptyTextSchema,
    label: nonEmptyTextSchema,
    evidence: metricEvidenceSchema,
    value: z.number().nullable(),
    unit: nonEmptyTextSchema,
    detail: nonEmptyTextSchema.optional(),
  })
  .superRefine((metric, context) => {
    if (metric.evidence === "unavailable" && metric.value !== null) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Unavailable metrics must have a null value",
      });
    }

    if (metric.evidence !== "unavailable" && metric.value === null) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Available metrics must have a numeric value",
      });
    }
  });
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;

export const monthlyMetricPointSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  value: z.number().nullable(),
});
export type MonthlyMetricPoint = z.infer<typeof monthlyMetricPointSchema>;

export const monthlyMetricSeriesSchema = z.object({
  key: nonEmptyTextSchema,
  label: nonEmptyTextSchema,
  evidence: metricEvidenceSchema,
  unit: nonEmptyTextSchema,
  detail: nonEmptyTextSchema.optional(),
  points: z.array(monthlyMetricPointSchema),
});
export type MonthlyMetricSeries = z.infer<typeof monthlyMetricSeriesSchema>;

export const dashboardSectionSchema = z
  .object({
    key: nonEmptyTextSchema,
    title: nonEmptyTextSchema,
    detail: nonEmptyTextSchema.optional(),
    metrics: z.array(dashboardMetricSchema).default([]),
    monthlySeries: z.array(monthlyMetricSeriesSchema).default([]),
  })
  .refine(
    (section) =>
      section.metrics.length > 0 || section.monthlySeries.length > 0,
    {
      message: "A dashboard section needs metrics or monthly series",
    },
  );
export type DashboardSection = z.infer<typeof dashboardSectionSchema>;

export const dashboardRequestSchema = z
  .object({
    periodStart: isoDateTimeSchema.optional(),
    periodEnd: isoDateTimeSchema.optional(),
    includeMonthlySeries: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((value) => value === "true"),
      ])
      .default(true),
  })
  .superRefine((request, context) => {
    const hasStart = request.periodStart !== undefined;
    const hasEnd = request.periodEnd !== undefined;

    if (hasStart !== hasEnd) {
      context.addIssue({
        code: "custom",
        message: "periodStart and periodEnd must be provided together",
      });
    }

    if (
      request.periodStart &&
      request.periodEnd &&
      Date.parse(request.periodEnd) <= Date.parse(request.periodStart)
    ) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "periodEnd must be after periodStart",
      });
    }
  });
export type DashboardRequest = z.infer<typeof dashboardRequestSchema>;

const dashboardResponseFields = {
  periodStart: isoDateTimeSchema,
  periodEnd: isoDateTimeSchema,
  generatedAt: isoDateTimeSchema,
  sections: z.array(dashboardSectionSchema).min(1),
  simulated: z.boolean(),
  simulationLabel: z.literal("SIMULADO").nullable(),
};

export const sellerDashboardNotice =
  "Estimativa para apoio gerencial. A dedutibilidade depende do regime tributário, documentação e validação contábil." as const;

export const sellerDashboardRequestSchema = dashboardRequestSchema;
export type SellerDashboardRequest = DashboardRequest;

export const sellerDashboardSchema = z.object({
  ...dashboardResponseFields,
  sellerId: uuidSchema,
  fiscalNotice: z.literal(sellerDashboardNotice),
});
export type SellerDashboard = z.infer<typeof sellerDashboardSchema>;
export const sellerDashboardResponseSchema = sellerDashboardSchema;
export type SellerDashboardResponse = SellerDashboard;

export const driverDashboardRequestSchema = dashboardRequestSchema;
export type DriverDashboardRequest = DashboardRequest;

export const driverDashboardSchema = z.object({
  ...dashboardResponseFields,
  driverId: uuidSchema,
});
export type DriverDashboard = z.infer<typeof driverDashboardSchema>;
export const driverDashboardResponseSchema = driverDashboardSchema;
export type DriverDashboardResponse = DriverDashboard;

export const ngoDashboardRequestSchema = dashboardRequestSchema;
export type NgoDashboardRequest = DashboardRequest;

export const ngoDashboardSchema = z.object({
  ...dashboardResponseFields,
  ngoId: uuidSchema,
});
export type NgoDashboard = z.infer<typeof ngoDashboardSchema>;
export const ngoDashboardResponseSchema = ngoDashboardSchema;
export type NgoDashboardResponse = NgoDashboard;

export const platformDashboardRequestSchema = dashboardRequestSchema;
export type PlatformDashboardRequest = DashboardRequest;

export const platformDashboardSchema = z.object({
  ...dashboardResponseFields,
  platformOperatorId: uuidSchema,
});
export type PlatformDashboard = z.infer<typeof platformDashboardSchema>;
export const platformDashboardResponseSchema = platformDashboardSchema;
export type PlatformDashboardResponse = PlatformDashboard;

export const impactMetricSchema = z.object({
  key: nonEmptyTextSchema,
  label: nonEmptyTextSchema,
  value: z.number(),
  unit: nonEmptyTextSchema,
});

export const impactDashboardSchema = z.object({
  periodStart: isoDateTimeSchema,
  periodEnd: isoDateTimeSchema,
  metrics: z.array(impactMetricSchema),
  byCategory: z.array(
    z.object({
      category: donationCategorySchema,
      donations: z.number().int().nonnegative(),
      weightKg: z.number().nonnegative(),
    }),
  ),
  recentDonationIds: z.array(uuidSchema),
});

export const simulatedForecastSchema = simulatedSchema.extend({
  generatedAt: isoDateTimeSchema,
  horizonDays: z.number().int().positive(),
  expectedDonations: z.number().nonnegative(),
  expectedWeightKg: z.number().nonnegative(),
  methodology: nonEmptyTextSchema,
});

export const partnerDashboardSchema = simulatedSchema.extend({
  partnerId: uuidSchema,
  sponsoredDeliveries: z.number().int().nonnegative(),
  estimatedReachPeople: z.number().int().nonnegative(),
  estimatedRoi: z.number().nonnegative(),
  activeCoupons: z.number().int().nonnegative(),
  metrics: z.array(impactMetricSchema),
});

export const queueStatusSchema = z.object({
  name: z.enum([
    "donation.created",
    "donation.classified",
    "offer.sent",
    "offer.timeout",
    "pickup.confirmed",
  ]),
  ready: z.number().int().nonnegative(),
  scheduled: z.number().int().nonnegative(),
  processing: z.number().int().nonnegative(),
  deadLetter: z.number().int().nonnegative(),
  oldestMessageAt: isoDateTimeSchema.nullable(),
});

export const queueDashboardSchema = z.object({
  driver: z.enum(["servicebus", "pg"]),
  queues: z.array(queueStatusSchema),
  checkedAt: isoDateTimeSchema,
});

export const replayDeadLetterRequestSchema = z.object({
  messageIds: z.array(uuidSchema).min(1).max(100),
});

export const replayDeadLetterResponseSchema = z.object({
  replayed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
