import {
  couponRedemptionSchema,
  couponSchema,
  demoUserSchema,
  donationEventSchema,
  donationSchema,
  deliveryReceiptSchema,
  driverRatingSchema,
  offerSchema,
  pickupSchema,
} from "@resgata/shared";

type Row = Record<string, unknown>;

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function nullableIso(value: unknown): string | null {
  return value === null || value === undefined ? null : iso(value);
}

function number(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : number(value);
}

export function mapDemoUser(row: Row) {
  return demoUserSchema.parse({
    id: row.id,
    demoKey: row.demo_key,
    role: row.role,
    displayName: row.display_name,
    phone: row.phone,
  });
}

export function mapDonation(row: Row) {
  return donationSchema.parse({
    id: row.id,
    sellerId: row.seller_id,
    status: row.status,
    category: row.category,
    description: row.description,
    quantity: number(row.quantity),
    unit: row.unit,
    estimatedWeightKg: number(row.estimated_weight_kg),
    unitValueBrl: nullableNumber(row.unit_value_brl),
    disposalCostBrl: nullableNumber(row.disposal_cost_brl),
    perishabilityMinutes: number(row.perishability_minutes),
    pickupAddress: row.pickup_address,
    availableFrom: iso(row.available_from),
    expiresAt: iso(row.expires_at),
    imageUrl: row.image_url,
    classification: row.classification,
    correlationId: row.correlation_id,
    version: number(row.version),
    simulated: row.simulated,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  });
}

export function mapDonationEvent(row: Row) {
  return donationEventSchema.parse({
    id: row.id,
    donationId: row.donation_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    eventType: row.event_type,
    correlationId: row.correlation_id,
    payload: row.payload,
    occurredAt: iso(row.occurred_at),
  });
}

export function mapOffer(row: Row) {
  return offerSchema.parse({
    id: row.id,
    donationId: row.donation_id,
    ngoId: row.ngo_id,
    rank: number(row.rank),
    status: row.status,
    score: row.score_breakdown,
    expiresAt: iso(row.expires_at),
    acceptedAt: nullableIso(row.accepted_at),
    correlationId: row.correlation_id,
    createdAt: iso(row.created_at),
  });
}

export function mapPickup(row: Row) {
  return pickupSchema.parse({
    id: row.id,
    donationId: row.donation_id,
    donationDescription: row.donation_description,
    estimatedWeightKg: number(row.estimated_weight_kg),
    ngoId: row.ngo_id,
    driverId: row.driver_id,
    status: row.status,
    pickupCode: String(row.pickup_code).trim(),
    deliveryCode: String(row.delivery_code).trim(),
    pickupLocation: {
      latitude: number(row.pickup_latitude),
      longitude: number(row.pickup_longitude),
    },
    deliveryLocation: {
      latitude: number(row.delivery_latitude),
      longitude: number(row.delivery_longitude),
    },
    assignedAt: nullableIso(row.assigned_at),
    collectedAt: nullableIso(row.collected_at),
    deliveredAt: nullableIso(row.delivered_at),
    deliveryDueAt: nullableIso(row.delivery_due_at),
    receipt: row.receipt_id
      ? mapDeliveryReceipt({
          id: row.receipt_id,
          pickup_id: row.id,
          ngo_id: row.ngo_id,
          condition: row.receipt_condition,
          received_weight_kg: row.received_weight_kg,
          rejected_weight_kg: row.rejected_weight_kg,
          rejection_reasons: row.rejection_reasons,
          photo_url: row.receipt_photo_url,
          notes: row.receipt_notes,
          simulated: row.receipt_simulated,
          simulation_label: row.receipt_simulation_label,
          created_at: row.receipt_created_at,
          updated_at: row.receipt_updated_at,
        })
      : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  });
}

export function mapDeliveryReceipt(row: Row) {
  return deliveryReceiptSchema.parse({
    id: row.id,
    pickupId: row.pickup_id,
    ngoId: row.ngo_id,
    condition: row.condition,
    receivedWeightKg: number(row.received_weight_kg),
    rejectedWeightKg: number(row.rejected_weight_kg),
    rejectionReasons: row.rejection_reasons,
    photoUrl: row.photo_url,
    notes: row.notes,
    simulated: row.simulated,
    simulationLabel: row.simulation_label,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  });
}

export function mapDriverRating(row: Row) {
  return driverRatingSchema.parse({
    id: row.id,
    pickupId: row.pickup_id,
    driverId: row.driver_id,
    reviewerUserId: row.reviewer_user_id,
    reviewerRole: row.reviewer_role,
    rating: number(row.rating),
    tags: row.tags,
    comment: row.comment,
    simulated: row.simulated,
    simulationLabel: row.simulation_label,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  });
}

export function mapCoupon(row: Row) {
  return couponSchema.parse({
    id: row.id,
    partnerId: row.partner_id,
    title: row.title,
    description: row.description,
    terms: row.terms,
    pointsCost: number(row.points_cost),
    stock: number(row.stock),
    validFrom: iso(row.valid_from),
    validUntil: iso(row.valid_until),
    active: row.active,
    simulated: row.simulated,
    simulationLabel: row.simulation_label,
  });
}

export function mapCouponRedemption(row: Row) {
  return couponRedemptionSchema.parse({
    id: row.id,
    couponId: row.coupon_id,
    driverId: row.driver_id,
    redemptionCode: row.redemption_code,
    status: row.status,
    issuedAt: iso(row.issued_at),
    usedAt: nullableIso(row.used_at),
    simulated: row.simulated,
    simulationLabel: row.simulation_label,
  });
}

export const pickupSelect = `
  pickup.id,
  pickup.donation_id,
  (
    SELECT donation.description
    FROM donations AS donation
    WHERE donation.id = pickup.donation_id
  ) AS donation_description,
  (
    SELECT donation.estimated_weight_kg
    FROM donations AS donation
    WHERE donation.id = pickup.donation_id
  ) AS estimated_weight_kg,
  pickup.ngo_id,
  pickup.driver_id,
  pickup.status,
  pickup.pickup_code,
  pickup.delivery_code,
  ST_Y(pickup.pickup_location::geometry) AS pickup_latitude,
  ST_X(pickup.pickup_location::geometry) AS pickup_longitude,
  ST_Y(pickup.delivery_location::geometry) AS delivery_latitude,
  ST_X(pickup.delivery_location::geometry) AS delivery_longitude,
  pickup.assigned_at,
  pickup.collected_at,
  pickup.delivered_at,
  pickup.delivery_due_at,
  (
    SELECT receipt.id
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_id,
  (
    SELECT receipt.condition
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_condition,
  (
    SELECT receipt.received_weight_kg
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS received_weight_kg,
  (
    SELECT receipt.rejected_weight_kg
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS rejected_weight_kg,
  (
    SELECT receipt.rejection_reasons
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS rejection_reasons,
  (
    SELECT receipt.photo_url
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_photo_url,
  (
    SELECT receipt.notes
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_notes,
  (
    SELECT receipt.simulated
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_simulated,
  (
    SELECT receipt.simulation_label
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_simulation_label,
  (
    SELECT receipt.created_at
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_created_at,
  (
    SELECT receipt.updated_at
    FROM delivery_receipts AS receipt
    WHERE receipt.pickup_id = pickup.id
  ) AS receipt_updated_at,
  pickup.created_at,
  pickup.updated_at
`;
