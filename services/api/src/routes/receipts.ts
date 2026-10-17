import { createDeliveryReceiptRequestSchema } from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import {
  correlationIdFrom,
  idempotencyKeyFrom,
  json,
  parseJson,
  pathUuid,
  type ApiHandler,
} from "../http.js";
import { idempotentTransaction } from "../idempotency.js";
import { mapDeliveryReceipt } from "../mappers.js";

const RECEIPT_WEIGHT_TOLERANCE_RATIO = 0.05;
const RECEIPT_WEIGHT_TOLERANCE_MINIMUM_KG = 0.1;

function sameReceipt(
  row: Record<string, unknown>,
  body: {
    condition: string;
    receivedWeightKg: number;
    rejectedWeightKg: number;
    rejectionReasons: string[];
    photoUrl?: string;
    notes?: string;
  },
): boolean {
  const reasons = Array.isArray(row.rejection_reasons)
    ? row.rejection_reasons.map(String)
    : [];
  return (
    row.condition === body.condition &&
    Number(row.received_weight_kg) === body.receivedWeightKg &&
    Number(row.rejected_weight_kg) === body.rejectedWeightKg &&
    JSON.stringify(reasons) === JSON.stringify(body.rejectionReasons) &&
    (row.photo_url ?? null) === (body.photoUrl ?? null) &&
    (row.notes ?? null) === (body.notes ?? null)
  );
}

export const createDeliveryReceipt: ApiHandler = async (request) => {
  const pickupId = pathUuid(request, "pickupId");
  const body = await parseJson(request, createDeliveryReceiptRequestSchema);
  const key = idempotencyKeyFrom(request);
  const correlationId = correlationIdFrom(request);
  const authClient = await getPool().connect();
  let actor;
  try {
    actor = await requireActor(authClient, request, ["ngo"]);
  } finally {
    authClient.release();
  }

  const result = await idempotentTransaction(
    "pickups.receipt",
    key,
    actor,
    { pickupId, ...body },
    async (client) => {
      const pickupResult = await client.query<{
        donation_id: string;
        status: string;
        estimated_weight_kg: number;
        simulated: boolean;
      }>(
        `SELECT
           pickup.donation_id,
           pickup.status,
           donation.estimated_weight_kg,
           donation.simulated
         FROM pickups AS pickup
         JOIN donations AS donation ON donation.id = pickup.donation_id
         WHERE pickup.id = $1 AND pickup.ngo_id = $2
         FOR UPDATE OF pickup`,
        [pickupId, actor.profileId],
      );
      const pickup = pickupResult.rows[0];
      if (!pickup) {
        throw new ApiError(404, "not_found", "Entrega não encontrada.");
      }
      if (pickup.status !== "delivered") {
        throw new ApiError(
          409,
          "state_conflict",
          "O recebimento só pode ser confirmado após a entrega.",
        );
      }

      const existing = await client.query(
        `SELECT *
         FROM delivery_receipts
         WHERE pickup_id = $1 AND ngo_id = $2`,
        [pickupId, actor.profileId],
      );
      if (existing.rows[0]) {
        if (!sameReceipt(existing.rows[0], body)) {
          throw new ApiError(
            409,
            "receipt_already_recorded",
            "Esta entrega já possui uma conferência diferente.",
          );
        }
        const receipt = mapDeliveryReceipt(existing.rows[0]);
        return { status: 200, body: receipt, resourceId: receipt.id };
      }

      const expectedWeightKg = Number(pickup.estimated_weight_kg);
      const informedWeightKg =
        body.receivedWeightKg + body.rejectedWeightKg;
      const toleranceKg = Math.max(
        RECEIPT_WEIGHT_TOLERANCE_MINIMUM_KG,
        expectedWeightKg * RECEIPT_WEIGHT_TOLERANCE_RATIO,
      );
      if (Math.abs(informedWeightKg - expectedWeightKg) > toleranceKg) {
        throw new ApiError(
          422,
          "receipt_weight_out_of_tolerance",
          "A soma dos pesos recebidos e rejeitados diverge do peso estimado.",
          {
            expectedWeightKg,
            informedWeightKg,
            toleranceKg: Math.round(toleranceKg * 100) / 100,
          },
        );
      }

      const inserted = await client.query(
        `INSERT INTO delivery_receipts (
           pickup_id,
           ngo_id,
           condition,
           received_weight_kg,
           rejected_weight_kg,
           rejection_reasons,
           photo_url,
           notes,
           idempotency_key,
           simulated,
           simulation_label
         ) VALUES (
           $1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11
         )
         RETURNING *`,
        [
          pickupId,
          actor.profileId,
          body.condition,
          body.receivedWeightKg,
          body.rejectedWeightKg,
          body.rejectionReasons,
          body.photoUrl ?? null,
          body.notes ?? null,
          key,
          pickup.simulated,
          pickup.simulated ? "SIMULADO" : null,
        ],
      );
      const receipt = mapDeliveryReceipt(inserted.rows[0]);
      await client.query(
        `INSERT INTO events (
           donation_id, from_status, to_status, event_type, correlation_id, payload
         ) VALUES (
           $1, 'delivered', 'delivered', 'delivery.received', $2, $3::jsonb
         )`,
        [
          pickup.donation_id,
          correlationId,
          JSON.stringify({
            pickupId,
            receiptId: receipt.id,
            condition: receipt.condition,
            receivedWeightKg: receipt.receivedWeightKg,
            rejectedWeightKg: receipt.rejectedWeightKg,
          }),
        ],
      );
      return { status: 201, body: receipt, resourceId: receipt.id };
    },
    200,
  );
  return json(result.status, result.body, correlationId);
};
