import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "./common.js";
import { donationCategorySchema } from "./donations.js";

export const ngoNeedStatusSchema = z.enum(["open", "fulfilled", "cancelled"]);
export type NgoNeedStatus = z.infer<typeof ngoNeedStatusSchema>;

export const ngoNeedSchema = z.object({
  id: uuidSchema,
  ngoId: uuidSchema,
  ngoName: z.string().optional(),
  category: donationCategorySchema,
  quantityKg: z.number().positive(),
  remainingKg: z.number().nonnegative(),
  neededBy: isoDateTimeSchema,
  notes: z.string().nullable(),
  status: ngoNeedStatusSchema,
  distanceKm: z.number().nonnegative().optional(),
  createdAt: isoDateTimeSchema,
});
export type NgoNeed = z.infer<typeof ngoNeedSchema>;

export const createNgoNeedRequestSchema = z.object({
  category: donationCategorySchema,
  quantityKg: z.number().positive().max(10_000),
  neededBy: isoDateTimeSchema,
  notes: z.string().trim().max(300).optional(),
});
export type CreateNgoNeedRequest = z.infer<typeof createNgoNeedRequestSchema>;

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const ngoAvailabilitySchema = z.object({
  receivingStart: timeOfDaySchema,
  receivingEnd: timeOfDaySchema,
  capacityKg: z.number().positive(),
  availableCapacityKg: z.number().nonnegative(),
});
export type NgoAvailability = z.infer<typeof ngoAvailabilitySchema>;

export const updateNgoAvailabilityRequestSchema = z
  .object({
    receivingStart: timeOfDaySchema,
    receivingEnd: timeOfDaySchema,
    availableCapacityKg: z.number().nonnegative(),
  })
  .refine((value) => value.receivingEnd > value.receivingStart, {
    message: "receivingEnd must be after receivingStart",
  });
export type UpdateNgoAvailabilityRequest = z.infer<
  typeof updateNgoAvailabilityRequestSchema
>;
