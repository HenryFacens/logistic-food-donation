import { z } from "zod";

export const uuidSchema = z.uuid();
export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const nonEmptyTextSchema = z.string().trim().min(1);
export const idempotencyKeySchema = z.string().trim().min(8).max(128);
export const correlationIdSchema = z.string().trim().min(8).max(128);

export const roleSchema = z.enum(["seller", "ngo", "driver", "partner"]);
export type Role = z.infer<typeof roleSchema>;

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

export const addressSchema = z.object({
  line1: nonEmptyTextSchema,
  line2: z.string().trim().optional(),
  district: nonEmptyTextSchema,
  city: nonEmptyTextSchema,
  state: z.string().trim().length(2),
  postalCode: z.string().regex(/^\d{5}-?\d{3}$/),
  location: geoPointSchema,
});
export type Address = z.infer<typeof addressSchema>;

export const paginationQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const pageInfoSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const errorSchema = z.object({
  error: z.object({
    code: nonEmptyTextSchema,
    message: nonEmptyTextSchema,
    correlationId: correlationIdSchema.optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof errorSchema>;

export const simulatedSchema = z.object({
  simulated: z.literal(true),
  simulationLabel: z.literal("SIMULADO"),
});
