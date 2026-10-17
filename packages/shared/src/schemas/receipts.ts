import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  uuidSchema,
} from "./common.js";

export const deliveryReceiptConditionSchema = z.enum([
  "all_good",
  "partial",
  "rejected",
]);
export type DeliveryReceiptCondition = z.infer<
  typeof deliveryReceiptConditionSchema
>;

const rejectionReasonsSchema = z
  .array(nonEmptyTextSchema.max(120))
  .max(20)
  .refine((reasons) => new Set(reasons).size === reasons.length, {
    message: "Rejection reasons must be unique",
  });

export const createDeliveryReceiptRequestSchema = z
  .object({
    condition: deliveryReceiptConditionSchema,
    receivedWeightKg: z.number().nonnegative(),
    rejectedWeightKg: z.number().nonnegative(),
    rejectionReasons: rejectionReasonsSchema.default([]),
    photoUrl: z.url().optional(),
    notes: z.string().trim().min(1).max(2_000).optional(),
  })
  .superRefine((receipt, context) => {
    const hasReasons = receipt.rejectionReasons.length > 0;

    if (
      receipt.condition === "all_good" &&
      (receipt.receivedWeightKg <= 0 ||
        receipt.rejectedWeightKg !== 0 ||
        hasReasons)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "An all-good receipt requires received weight and no rejection",
      });
    }

    if (
      receipt.condition === "partial" &&
      (receipt.receivedWeightKg <= 0 ||
        receipt.rejectedWeightKg <= 0 ||
        !hasReasons)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A partial receipt requires received and rejected weights plus reasons",
      });
    }

    if (
      receipt.condition === "rejected" &&
      (receipt.receivedWeightKg !== 0 ||
        receipt.rejectedWeightKg <= 0 ||
        !hasReasons)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A rejected receipt requires rejected weight, reasons, and zero received weight",
      });
    }
  });
export type CreateDeliveryReceiptRequest = z.infer<
  typeof createDeliveryReceiptRequestSchema
>;

export const deliveryReceiptSchema = z.object({
  id: uuidSchema,
  pickupId: uuidSchema,
  ngoId: uuidSchema,
  condition: deliveryReceiptConditionSchema,
  receivedWeightKg: z.number().nonnegative(),
  rejectedWeightKg: z.number().nonnegative(),
  rejectionReasons: rejectionReasonsSchema,
  photoUrl: z.url().nullable(),
  notes: z.string().nullable(),
  simulated: z.boolean(),
  simulationLabel: z.literal("SIMULADO").nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type DeliveryReceipt = z.infer<typeof deliveryReceiptSchema>;

export const deliveryReceiptResponseSchema = deliveryReceiptSchema;
export type DeliveryReceiptResponse = DeliveryReceipt;
export const createDeliveryReceiptResponseSchema = deliveryReceiptSchema;
export type CreateDeliveryReceiptResponse = DeliveryReceipt;
