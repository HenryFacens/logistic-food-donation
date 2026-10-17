import { z } from "zod";
import { addressSchema } from "./common.js";

export const geocodeSourceSchema = z.enum(["nominatim", "viacep", "simulated"]);

export const geocodeResultSchema = z.object({
  address: addressSchema,
  source: geocodeSourceSchema,
  simulated: z.boolean(),
});
export type GeocodeResult = z.infer<typeof geocodeResultSchema>;

export const sellerProfileSchema = z.object({
  id: z.uuid(),
  legalName: z.string().min(1),
  address: addressSchema,
});
export type SellerProfile = z.infer<typeof sellerProfileSchema>;

export const updateSellerProfileRequestSchema = z.object({
  address: addressSchema,
});
