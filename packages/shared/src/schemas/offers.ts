import { z } from "zod";
import {
  correlationIdSchema,
  isoDateTimeSchema,
  pageInfoSchema,
  uuidSchema,
} from "./common.js";
import { donationSchema } from "./donations.js";

export const offerStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "timed_out",
  "cancelled",
]);
export type OfferStatus = z.infer<typeof offerStatusSchema>;

export const scoreComponentSchema = z.object({
  raw: z.number(),
  normalized: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  contribution: z.number().min(0).max(100),
});

export const matchingScoreSchema = z.object({
  total: z.number().min(0).max(100),
  eligible: z.boolean(),
  rejectionReasons: z.array(z.string()),
  components: z.object({
    distance: scoreComponentSchema,
    capacity: scoreComponentSchema,
    perishability: scoreComponentSchema,
    categoryNeed: scoreComponentSchema,
  }),
});
export type MatchingScore = z.infer<typeof matchingScoreSchema>;

export const offerSchema = z.object({
  id: uuidSchema,
  donationId: uuidSchema,
  ngoId: uuidSchema,
  rank: z.number().int().positive(),
  status: offerStatusSchema,
  score: matchingScoreSchema,
  expiresAt: isoDateTimeSchema,
  acceptedAt: isoDateTimeSchema.nullable(),
  correlationId: correlationIdSchema,
  createdAt: isoDateTimeSchema,
  donation: donationSchema.optional(),
  distanceKm: z.number().nonnegative().optional(),
  etaMinutes: z.number().int().nonnegative().optional(),
});
export type Offer = z.infer<typeof offerSchema>;

export const offerListSchema = z.object({
  items: z.array(offerSchema),
  page: pageInfoSchema,
});

export const offerDecisionRequestSchema = z.object({
  correlationId: correlationIdSchema.optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const offerDecisionResponseSchema = z.object({
  offer: offerSchema,
  accepted: z.boolean(),
  donationStatus: z.enum(["offered", "accepted"]),
});

export const freightRequestSchema = z.object({
  id: uuidSchema,
  donationId: uuidSchema,
  status: z.enum(["requested", "quoted", "unavailable", "cancelled"]),
  providerName: z.string().min(1),
  quotedAmountBrl: z.number().nonnegative().nullable(),
  simulated: z.literal(true),
  simulationLabel: z.literal("SIMULADO"),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type FreightRequest = z.infer<typeof freightRequestSchema>;
