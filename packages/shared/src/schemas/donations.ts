import { z } from "zod";
import {
  addressSchema,
  correlationIdSchema,
  isoDateTimeSchema,
  nonEmptyTextSchema,
  pageInfoSchema,
  uuidSchema,
} from "./common.js";

export const donationCategorySchema = z.enum([
  "produce",
  "bakery",
  "dairy",
  "prepared",
  "pantry",
  "other",
]);
export type DonationCategory = z.infer<typeof donationCategorySchema>;

export const donationStatusSchema = z.enum([
  "posted",
  "classified",
  "offered",
  "accepted",
  "collected",
  "delivered",
  "expired",
  "no_destination",
]);
export type DonationStatus = z.infer<typeof donationStatusSchema>;

export const donationUnitSchema = z.enum(["kg", "unit", "box", "tray"]);
export type DonationUnit = z.infer<typeof donationUnitSchema>;

export const visionSourceSchema = z.enum(["camera", "upload", "manual"]);

export const foodConditionSchema = z.enum(["good", "attention", "unsafe"]);
export type FoodCondition = z.infer<typeof foodConditionSchema>;

export const classificationSchema = z.object({
  category: donationCategorySchema,
  description: nonEmptyTextSchema,
  confidence: z.number().min(0).max(1),
  perishabilityMinutes: z.number().int().min(15).max(7 * 24 * 60),
  source: visionSourceSchema,
  simulated: z.boolean(),
  // Optional fields filled by real image analysis; mock results omit them.
  isFood: z.boolean().optional(),
  items: z.array(nonEmptyTextSchema).max(20).optional(),
  suggestedQuantity: z.number().positive().optional(),
  suggestedUnit: donationUnitSchema.optional(),
  estimatedWeightKg: z.number().positive().optional(),
  condition: foodConditionSchema.optional(),
  conditionNotes: z.string().trim().max(500).optional(),
  model: z.string().optional(),
  // Stored copy of the analyzed photo, reusable when publishing.
  photoId: z.uuid().optional(),
});
export type Classification = z.infer<typeof classificationSchema>;

export const classifyDonationRequestSchema = z
  .object({
    imageUrl: z.url().optional(),
    imageBase64: z.string().min(1).optional(),
    manualDescription: z.string().trim().min(1).optional(),
    source: visionSourceSchema,
  })
  .refine(
    (value) =>
      Boolean(value.imageUrl || value.imageBase64 || value.manualDescription),
    { message: "At least one image or manual description is required" },
  );
export type ClassifyDonationRequest = z.infer<
  typeof classifyDonationRequestSchema
>;

export const createDonationRequestSchema = z.object({
  category: donationCategorySchema.optional(),
  description: nonEmptyTextSchema,
  quantity: z.number().positive(),
  unit: donationUnitSchema,
  estimatedWeightKg: z.number().positive(),
  perishabilityMinutes: z.number().int().min(15).max(7 * 24 * 60),
  pickupAddress: addressSchema,
  availableFrom: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  imageUrl: z.url().optional(),
  photoId: z.uuid().optional(),
  classification: classificationSchema.optional(),
  unitValueBrl: z.number().nonnegative().optional(),
  disposalCostBrl: z.number().nonnegative().optional(),
});
export type CreateDonationRequest = z.infer<
  typeof createDonationRequestSchema
>;

export const donationSchema = z.object({
  id: uuidSchema,
  sellerId: uuidSchema,
  status: donationStatusSchema,
  category: donationCategorySchema.nullable(),
  description: nonEmptyTextSchema,
  quantity: z.number().positive(),
  unit: donationUnitSchema,
  estimatedWeightKg: z.number().positive(),
  perishabilityMinutes: z.number().int().positive(),
  pickupAddress: addressSchema,
  availableFrom: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  // Absolute URL or an API-relative photo path such as /api/photos/{id}.
  imageUrl: z.string().min(1).nullable(),
  classification: classificationSchema.nullable(),
  unitValueBrl: z.number().nonnegative().nullable(),
  disposalCostBrl: z.number().nonnegative().nullable(),
  /** Delivery progress, present for the donor's own donations. */
  pickup: z
    .object({
      status: z.string(),
      /** Six-digit code the donor gives the driver at pickup. */
      pickupCode: z.string().length(6).nullable(),
      driverName: z.string().nullable(),
      vehicle: z.string().nullable(),
      ngoName: z.string(),
      assignedAt: isoDateTimeSchema.nullable(),
      collectedAt: isoDateTimeSchema.nullable(),
      deliveredAt: isoDateTimeSchema.nullable(),
    })
    .nullable()
    .optional(),
  correlationId: correlationIdSchema,
  version: z.number().int().nonnegative(),
  simulated: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Donation = z.infer<typeof donationSchema>;

export const donationListQuerySchema = z.object({
  sellerId: uuidSchema.optional(),
  status: donationStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const donationListSchema = z.object({
  items: z.array(donationSchema),
  page: pageInfoSchema,
});

export const donationEventSchema = z.object({
  id: uuidSchema,
  donationId: uuidSchema,
  fromStatus: donationStatusSchema.nullable(),
  toStatus: donationStatusSchema,
  eventType: nonEmptyTextSchema,
  correlationId: correlationIdSchema,
  payload: z.record(z.string(), z.unknown()),
  occurredAt: isoDateTimeSchema,
});
export type DonationEvent = z.infer<typeof donationEventSchema>;

export const donationTransitionSchema = z.object({
  donationId: uuidSchema,
  expectedStatus: donationStatusSchema,
  nextStatus: donationStatusSchema,
  eventType: nonEmptyTextSchema,
  correlationId: correlationIdSchema,
  occurredAt: isoDateTimeSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type DonationTransition = z.infer<typeof donationTransitionSchema>;
