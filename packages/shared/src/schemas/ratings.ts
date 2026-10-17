import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  pageInfoSchema,
  uuidSchema,
} from "./common.js";

export const driverRatingReviewerRoleSchema = z.enum(["seller", "ngo"]);
export type DriverRatingReviewerRole = z.infer<
  typeof driverRatingReviewerRoleSchema
>;

const ratingTagsSchema = z
  .array(nonEmptyTextSchema.max(40))
  .max(10)
  .refine((tags) => new Set(tags).size === tags.length, {
    message: "Rating tags must be unique",
  });

export const createDriverRatingRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: ratingTagsSchema.default([]),
  comment: z.string().trim().min(1).max(1_000).optional(),
});
export type CreateDriverRatingRequest = z.infer<
  typeof createDriverRatingRequestSchema
>;

export const driverRatingSchema = z.object({
  id: uuidSchema,
  pickupId: uuidSchema,
  driverId: uuidSchema,
  reviewerUserId: uuidSchema,
  reviewerRole: driverRatingReviewerRoleSchema,
  rating: z.number().int().min(1).max(5),
  tags: ratingTagsSchema,
  comment: z.string().nullable(),
  simulated: z.boolean(),
  simulationLabel: z.literal("SIMULADO").nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type DriverRating = z.infer<typeof driverRatingSchema>;

export const driverRatingResponseSchema = driverRatingSchema;
export type DriverRatingResponse = DriverRating;
export const createDriverRatingResponseSchema = driverRatingSchema;
export type CreateDriverRatingResponse = DriverRating;

export const ratingOpportunityStatusSchema = z.enum([
  "available",
  "completed",
]);

export const driverRatingOpportunitySchema = z.object({
  pickupId: uuidSchema,
  donationId: uuidSchema,
  donationDescription: nonEmptyTextSchema,
  driverId: uuidSchema,
  driverDisplayName: nonEmptyTextSchema,
  reviewerRole: driverRatingReviewerRoleSchema,
  status: ratingOpportunityStatusSchema,
  availableAt: isoDateTimeSchema,
  completedRating: driverRatingSchema.nullable(),
});
export type DriverRatingOpportunity = z.infer<
  typeof driverRatingOpportunitySchema
>;

export const ratingOpportunitiesRequestSchema = z.object({
  status: ratingOpportunityStatusSchema.optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RatingOpportunitiesRequest = z.infer<
  typeof ratingOpportunitiesRequestSchema
>;

export const ratingOpportunitiesResponseSchema = z.object({
  items: z.array(driverRatingOpportunitySchema),
  page: pageInfoSchema,
});
export type RatingOpportunitiesResponse = z.infer<
  typeof ratingOpportunitiesResponseSchema
>;
