import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  pageInfoSchema,
  simulatedSchema,
  uuidSchema,
} from "./common.js";

export const couponSchema = simulatedSchema.extend({
  id: uuidSchema,
  partnerId: uuidSchema,
  title: nonEmptyTextSchema,
  description: nonEmptyTextSchema,
  terms: nonEmptyTextSchema,
  pointsCost: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  validFrom: isoDateTimeSchema,
  validUntil: isoDateTimeSchema,
  active: z.boolean(),
});
export type Coupon = z.infer<typeof couponSchema>;

export const couponListSchema = z.object({
  items: z.array(couponSchema),
  page: pageInfoSchema,
});

export const couponRedemptionSchema = simulatedSchema.extend({
  id: uuidSchema,
  couponId: uuidSchema,
  driverId: uuidSchema,
  redemptionCode: nonEmptyTextSchema,
  status: z.enum(["issued", "used", "cancelled"]),
  issuedAt: isoDateTimeSchema,
  usedAt: isoDateTimeSchema.nullable(),
});
export type CouponRedemption = z.infer<typeof couponRedemptionSchema>;
