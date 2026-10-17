import { z } from "zod";
import {
  addressSchema,
  geoPointSchema,
  nonEmptyTextSchema,
  roleSchema,
  uuidSchema,
} from "./common.js";
import { donationCategorySchema } from "./donations.js";

export const demoUserSchema = z.object({
  id: uuidSchema,
  demoKey: nonEmptyTextSchema,
  role: roleSchema,
  displayName: nonEmptyTextSchema,
  phone: z.string().trim().min(10).max(20),
});
export type DemoUser = z.infer<typeof demoUserSchema>;

/** `GET /me`: the demo identity plus the selected role profile. */
export const currentDemoUserSchema = demoUserSchema.extend({
  profileId: uuidSchema,
  /** Vehicle capacity, returned only for drivers. */
  capacityKg: z.number().positive().optional(),
});
export type CurrentDemoUser = z.infer<typeof currentDemoUserSchema>;

export const sellerSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  legalName: nonEmptyTextSchema,
  document: nonEmptyTextSchema,
  address: addressSchema,
});
export type Seller = z.infer<typeof sellerSchema>;

export const ngoSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  name: nonEmptyTextSchema,
  document: nonEmptyTextSchema,
  address: addressSchema,
  capacityKg: z.number().positive(),
  currentLoadKg: z.number().nonnegative(),
  serviceRadiusKm: z.number().positive(),
  acceptedCategories: z.array(donationCategorySchema).min(1),
  categoryNeeds: z.record(donationCategorySchema, z.number().min(0).max(1)),
  active: z.boolean(),
});
export type Ngo = z.infer<typeof ngoSchema>;

export const driverSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  name: nonEmptyTextSchema,
  vehicle: nonEmptyTextSchema,
  licensePlate: nonEmptyTextSchema,
  capacityKg: z.number().positive(),
  currentLocation: geoPointSchema,
  active: z.boolean(),
});
export type Driver = z.infer<typeof driverSchema>;

export const partnerSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  name: nonEmptyTextSchema,
  description: nonEmptyTextSchema,
  active: z.boolean(),
});
export type Partner = z.infer<typeof partnerSchema>;
