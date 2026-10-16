import { z } from "zod";
import {
  geoPointSchema,
  isoDateTimeSchema,
  pageInfoSchema,
  uuidSchema,
} from "./common.js";

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

export const pickupSchema = z.object({
  id: uuidSchema,
  donationId: uuidSchema,
  ngoId: uuidSchema,
  driverId: uuidSchema.nullable(),
  status: pickupStatusSchema,
  pickupCode: z.string().length(6),
  deliveryCode: z.string().length(6),
  pickupLocation: geoPointSchema,
  deliveryLocation: geoPointSchema,
  assignedAt: isoDateTimeSchema.nullable(),
  collectedAt: isoDateTimeSchema.nullable(),
  deliveredAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
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
