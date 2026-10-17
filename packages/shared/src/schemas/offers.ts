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

/** How a donation fits one specific NGO request. */
export const needMatchSchema = z.object({
  needId: uuidSchema,
  item: z.string().min(1),
  /** 0-1 fit between the donation and the request. */
  fit: z.number().min(0).max(1),
  /** Estimated amount of the request covered, in the request's unit. */
  coveredQuantity: z.number().nonnegative().nullable(),
  unit: z.enum(["kg", "unit", "box", "tray"]),
  remainingQuantity: z.number().nonnegative(),
  reason: z.string(),
  source: z.enum(["claude", "rules"]),
});
export type NeedMatch = z.infer<typeof needMatchSchema>;

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
  needMatch: needMatchSchema.optional(),
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

export const matchingCandidateViewSchema = z.object({
  ngoId: uuidSchema,
  ngoName: z.string().min(1),
  rank: z.number().int().positive(),
  eligible: z.boolean(),
  score: z.number().min(0).max(100),
  distanceKm: z.number().nonnegative(),
  etaMinutes: z.number().nonnegative(),
  /** 0-1 need signal; >= 0.6 means a published, open need for the category. */
  needScore: z.number().min(0).max(1),
  rejectionReasons: z.array(z.string()),
  offerStatus: offerStatusSchema.nullable(),
  needMatch: needMatchSchema.optional(),
});
export type MatchingCandidateView = z.infer<typeof matchingCandidateViewSchema>;

export const matchingExplanationSchema = z.object({
  donationId: uuidSchema,
  runAt: isoDateTimeSchema.nullable(),
  candidates: z.array(matchingCandidateViewSchema),
  /** Active NGOs whose service radius does not reach the pickup point. */
  outOfRange: z.array(
    z.object({
      ngoName: z.string().min(1),
      distanceKm: z.number().nonnegative(),
      serviceRadiusKm: z.number().positive(),
    }),
  ),
});
export type MatchingExplanation = z.infer<typeof matchingExplanationSchema>;
