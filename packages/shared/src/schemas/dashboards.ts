import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  simulatedSchema,
  uuidSchema,
} from "./common.js";
import { donationCategorySchema } from "./donations.js";

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
