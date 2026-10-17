import { z } from "zod";
import {
  addressSchema,
  geoPointSchema,
  isoDateTimeSchema,
  nonEmptyTextSchema,
  pageInfoSchema,
  uuidSchema,
} from "./common.js";
import { donationCategorySchema, donationUnitSchema } from "./donations.js";

export const pickupStatusSchema = z.enum([
  "awaiting_driver",
  "assigned",
  "en_route_pickup",
  "collected",
  "en_route_delivery",
  "delivered",
  "cancelled",
]);
export type PickupStatus = z.infer<typeof pickupStatusSchema>;

/**
 * Decision data for drivers, joined from the donation, seller, and NGO.
 * Present on `GET /pickups`; other pickup responses may omit it.
 */
export const pickupSummarySchema = z.object({
  category: donationCategorySchema.nullable(),
  description: nonEmptyTextSchema,
  estimatedWeightKg: z.number().positive(),
  quantity: z.number().positive(),
  unit: donationUnitSchema,
  expiresAt: isoDateTimeSchema,
  sellerName: nonEmptyTextSchema,
  pickupAddress: addressSchema,
  ngoName: nonEmptyTextSchema,
  deliveryAddress: addressSchema,
  routeDistanceKm: z.number().nonnegative(),
  /** Distance from the requesting driver; null for other roles. */
  distanceToPickupKm: z.number().nonnegative().nullable(),
  /** Collection + delivery points, the same rule the API credits. */
  rewardPoints: z.number().int().nonnegative(),
});
export type PickupSummary = z.infer<typeof pickupSummarySchema>;

export const pickupSchema = z.object({
  id: uuidSchema,
  donationId: uuidSchema,
  ngoId: uuidSchema,
  driverId: uuidSchema.nullable(),
  status: pickupStatusSchema,
  /** Proof codes; omitted from driver responses (the seller/NGO informs them). */
  pickupCode: z.string().length(6).optional(),
  deliveryCode: z.string().length(6).optional(),
  pickupLocation: geoPointSchema,
  deliveryLocation: geoPointSchema,
  assignedAt: isoDateTimeSchema.nullable(),
  collectedAt: isoDateTimeSchema.nullable(),
  deliveredAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  summary: pickupSummarySchema.optional(),
});
export type Pickup = z.infer<typeof pickupSchema>;

export const pickupListSchema = z.object({
  items: z.array(pickupSchema),
  page: pageInfoSchema,
});

export const assignPickupRequestSchema = z.object({
  driverId: uuidSchema,
});

export const confirmPickupRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  location: geoPointSchema,
});
