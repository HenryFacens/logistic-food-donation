import {
  driverRoutePlanSchema,
  haversineKm,
  planDeliveryRoute,
  planInGivenOrder,
  type GeoPoint,
  type RouteJob,
} from "@resgata/shared";
import { requireActor } from "../auth.js";
import { routeThrough, travelMinutesMatrix } from "../azure-maps.js";
import { getPool } from "../db.js";
import { json, type ApiHandler } from "../http.js";

type JobRow = {
  id: string;
  status: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_latitude: number;
  delivery_longitude: number;
  seller_name: string;
  pickup_address: { line1?: string; district?: string } | null;
  ngo_name: string;
  ngo_address: { line1?: string; district?: string } | null;
  expires_at: Date;
  deliver_by: Date;
};

const NEEDS_PICKUP = new Set(["assigned", "en_route_pickup"]);
// Urban estimate when Azure Maps is unavailable: 1.3× straight line at 25 km/h.
const estimateMinutes = (from: GeoPoint, to: GeoPoint) =>
  ((haversineKm(from, to) * 1.3) / 25) * 60;

const describe = (address: { line1?: string; district?: string } | null) =>
  [address?.district, address?.line1].filter(Boolean).join(" · ");

/** Optimized stop order for the signed-in driver's active deliveries. */
export const getDriverRoutePlan: ApiHandler = async (request) => {
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["driver"]);
    const driver = await client.query<{ latitude: number; longitude: number }>(
      `SELECT ST_Y(current_location::geometry) AS latitude,
              ST_X(current_location::geometry) AS longitude
       FROM drivers WHERE id = $1`,
      [actor.profileId],
    );
    const start: GeoPoint = {
      latitude: Number(driver.rows[0]!.latitude),
      longitude: Number(driver.rows[0]!.longitude),
    };
    const result = await client.query<JobRow>(
      `SELECT pickup.id,
              pickup.status::text AS status,
              ST_Y(pickup.pickup_location::geometry) AS pickup_latitude,
              ST_X(pickup.pickup_location::geometry) AS pickup_longitude,
              ST_Y(pickup.delivery_location::geometry) AS delivery_latitude,
              ST_X(pickup.delivery_location::geometry) AS delivery_longitude,
              seller.legal_name AS seller_name,
              donation.pickup_address,
              ngo.name AS ngo_name,
              ngo.address AS ngo_address,
              donation.expires_at,
              GREATEST(
                donation.expires_at,
                donation.available_from + donation.perishability_minutes * interval '1 minute'
              ) AS deliver_by
       FROM pickups AS pickup
       JOIN donations AS donation ON donation.id = pickup.donation_id
       JOIN sellers AS seller ON seller.id = donation.seller_id
       JOIN ngos AS ngo ON ngo.id = pickup.ngo_id
       WHERE pickup.driver_id = $1
         AND pickup.status IN ('assigned', 'en_route_pickup', 'collected', 'en_route_delivery')
       ORDER BY pickup.assigned_at NULLS LAST, pickup.created_at, pickup.id`,
      [actor.profileId],
    );

    // Matrix index 0 is the driver; each job adds its pickup (if pending)
    // and its delivery.
    const points: GeoPoint[] = [start];
    const now = Date.now();
    const minutesUntil = (date: Date) => (date.getTime() - now) / 60_000;
    const jobs: RouteJob[] = result.rows.map((row) => {
      let pickupIndex: number | null = null;
      if (NEEDS_PICKUP.has(row.status)) {
        pickupIndex = points.length;
        points.push({ latitude: Number(row.pickup_latitude), longitude: Number(row.pickup_longitude) });
      }
      const deliveryIndex = points.length;
      points.push({ latitude: Number(row.delivery_latitude), longitude: Number(row.delivery_longitude) });
      return {
        id: row.id,
        pickupIndex,
        deliveryIndex,
        pickupDeadlineMinutes: pickupIndex === null ? null : minutesUntil(row.expires_at),
        deliveryDeadlineMinutes: minutesUntil(row.deliver_by),
      };
    });

    const azure = await travelMinutesMatrix(points);
    const minutes = points.map((from, i) =>
      points.map((to, j) => {
        const value = azure?.[i]?.[j];
        return value !== undefined && Number.isFinite(value) ? value : estimateMinutes(from, to);
      }),
    );
    const plan = planDeliveryRoute(0, jobs, minutes);
    const baseline = planInGivenOrder(0, jobs, minutes);

    const ordered = plan.stops.map((stop) => points[stop.index]!);
    const road = ordered.length
      ? await routeThrough([start, ...ordered]).catch(() => null)
      : null;

    const rowById = new Map(result.rows.map((row) => [row.id, row]));
    return json(
      200,
      driverRoutePlanSchema.parse({
        start,
        stops: plan.stops.map((stop, position) => {
          const row = rowById.get(stop.jobId)!;
          const isPickup = stop.kind === "pickup";
          return {
            order: position + 1,
            kind: stop.kind,
            pickupId: stop.jobId,
            name: isPickup ? row.seller_name : row.ngo_name,
            address: describe(isPickup ? row.pickup_address : row.ngo_address),
            point: points[stop.index],
            etaMinutes: Math.round(stop.arrivalMinutes),
            deadline: (isPickup ? row.expires_at : row.deliver_by).toISOString(),
            lateMinutes: Math.round(stop.lateMinutes),
          };
        }),
        drivingMinutes: Math.round(plan.drivingMinutes),
        distanceKm: road ? Math.round(road.distanceKm * 10) / 10 : null,
        baselineMinutes: Math.round(baseline.drivingMinutes),
        savedMinutes: Math.round(baseline.drivingMinutes - plan.drivingMinutes),
        lateMinutes: Math.round(plan.lateMinutes),
        method: plan.method,
        travelTimes: azure ? "azure-maps" : "estimate",
        path: road?.path ?? null,
        generatedAt: new Date().toISOString(),
      }),
    );
  } finally {
    client.release();
  }
};
