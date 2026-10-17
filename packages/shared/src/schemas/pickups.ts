import { z } from "zod";
import {
  addressSchema,
  geoPointSchema,
  isoDateTimeSchema,
  nonEmptyTextSchema,
  pageInfoSchema,
  uuidSchema,
} from "./common.js";
import { deliveryReceiptSchema } from "./receipts.js";
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

/** One itemized line of a donation, e.g. "Bananas, 12 kg". */
export const pickupItemSchema = z.object({
  name: nonEmptyTextSchema,
  quantity: z.number().positive(),
  unit: donationUnitSchema,
});
export type PickupItem = z.infer<typeof pickupItemSchema>;

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
  /** Itemized contents; empty when the seller only gave a description. */
  items: z.array(pickupItemSchema),
  /** Pickup deadline at the seller (the donation expiry). */
  expiresAt: isoDateTimeSchema,
  /** Delivery deadline at the NGO: availableFrom + perishability, never before expiresAt. */
  deliverBy: isoDateTimeSchema,
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
  donationDescription: z.string().trim().min(1),
  estimatedWeightKg: z.number().positive(),
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
  deliveryDueAt: isoDateTimeSchema.nullable(),
  deliveredAt: isoDateTimeSchema.nullable(),
  receipt: deliveryReceiptSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  // Present on driver listings: distance from the driver to the pickup.
  distanceKm: z.number().nonnegative().optional(),
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

export const driverAvailabilityRequestSchema = z.object({
  available: z.boolean(),
  location: geoPointSchema.optional(),
});
export type DriverAvailabilityRequest = z.infer<
  typeof driverAvailabilityRequestSchema
>;

export const driverStatusSchema = z.object({
  id: uuidSchema,
  available: z.boolean(),
  capacityKg: z.number().positive(),
  currentLocation: geoPointSchema,
});
export type DriverStatus = z.infer<typeof driverStatusSchema>;

export const confirmPickupRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  location: geoPointSchema,
});
