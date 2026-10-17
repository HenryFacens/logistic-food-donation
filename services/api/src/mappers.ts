import {
  couponRedemptionSchema,
  couponSchema,
  demoUserSchema,
  donationEventSchema,
  donationSchema,
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
  // The matching score keeps the raw distance (km) and ETA (minutes).
  const components = (row.score_breakdown as {
    components?: {
      distance?: { raw?: number };
      perishability?: { raw?: number };
    };
  } | null)?.components;
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
    distanceKm: components?.distance?.raw,
    etaMinutes:
      components?.perishability?.raw === undefined
        ? undefined
        : Math.round(components.perishability.raw),
  });
}

export function mapPickup(row: Row) {
  return pickupSchema.parse({
    id: row.id,
    donationId: row.donation_id,
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
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    distanceKm:
      row.distance_km === undefined || row.distance_km === null
        ? undefined
        : Math.round(number(row.distance_km) * 10) / 10,
    donationWeightKg:
      row.donation_weight_kg === undefined
        ? undefined
        : number(row.donation_weight_kg),
    donationDescription: row.donation_description ?? undefined,
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
  pickup.created_at,
  pickup.updated_at
`;
