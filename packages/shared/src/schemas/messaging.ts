import { z } from "zod";
import {
  correlationIdSchema,
  isoDateTimeSchema,
  nonEmptyTextSchema,
  uuidSchema,
} from "./common.js";

export const queueNameSchema = z.enum([
  "donation.created",
  "donation.classified",
  "offer.sent",
  "offer.timeout",
  "pickup.confirmed",
]);
export type QueueName = z.infer<typeof queueNameSchema>;

export const messageEnvelopeSchema = z.object({
  id: uuidSchema,
  topic: queueNameSchema,
  type: nonEmptyTextSchema,
  aggregateId: uuidSchema,
  correlationId: correlationIdSchema,
  causationId: uuidSchema.nullable(),
  occurredAt: isoDateTimeSchema,
  attempt: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()),
});
export type MessageEnvelope = z.infer<typeof messageEnvelopeSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  version: nonEmptyTextSchema,
  database: z.enum(["up", "down"]),
  messageBus: z.enum(["up", "down"]),
  checkedAt: isoDateTimeSchema,
});
