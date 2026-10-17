import {
  haversineKm,
  planDeliveryRoute,
  tripMatchRequestSchema,
  tripMatchSchema,
  type GeoPoint,
  type Pickup,
  type RouteJob,
  type TripCandidate,
} from "@resgata/shared";
import { requireActor } from "../auth.js";
import { routeThrough, travelMinutesMatrix } from "../azure-maps.js";
import { getPool } from "../db.js";
import { json, parseJson, type ApiHandler } from "../http.js";
import { mapPickup, pickupSummaryJoins, pickupSummarySelect } from "../mappers.js";

/** Extra driving the driver accepts unless they say otherwise. */
const DEFAULT_MAX_DETOUR_MINUTES = 25;
/** Candidates checked against real road times (each costs one matrix call). */
const ROAD_CHECKED_CANDIDATES = 8;
/** Deliveries the server bundles into one trip by itself. */
const MAX_AUTO_JOBS = 3;

// Urban estimate when Azure Maps is unavailable: 1.3× straight line at 25 km/h.
const estimateMinutes = (from: GeoPoint, to: GeoPoint) =>
  ((haversineKm(from, to) * 1.3) / 25) * 60;

/** Road minutes between every pair of points, estimated where Azure has no answer. */
async function minutesBetween(points: GeoPoint[]) {
  const azure = await travelMinutesMatrix(points);
  const matrix = points.map((from, i) =>
    points.map((to, j) => {
      const value = azure?.[i]?.[j];
      return value !== undefined && Number.isFinite(value) ? value : estimateMinutes(from, to);
    }),
  );
  return { matrix, fromAzure: azure !== null };
}

type SummarizedPickup = Pickup & { summary: NonNullable<Pickup["summary"]> };

/**
 * The trip plan, with `origin` = 0 and `destination` = 1 in the matrix and each
 * delivery adding its pickup and drop-off. Deadlines count from departure.
 */
function planTrip(
  pickups: SummarizedPickup[],
  matrix: number[][],
  pickupOffset: (index: number) => number,
  departAt: Date,
) {
  const untilDeparture = (iso: string) => (new Date(iso).getTime() - departAt.getTime()) / 60_000;
  const jobs: RouteJob[] = pickups.map((pickup, index) => ({
    id: pickup.id,
    pickupIndex: pickupOffset(index),
    deliveryIndex: pickupOffset(index) + 1,
    pickupDeadlineMinutes: untilDeparture(pickup.summary.expiresAt),
    deliveryDeadlineMinutes: untilDeparture(pickup.summary.deliverBy),
  }));
  return planDeliveryRoute(0, jobs, matrix, { end: 1 });
}

/**
 * Deliveries that fit a trip the driver is already making ("BlaBlaCar" mode),
 * ranked by the extra minutes each adds, plus the best combined route.
 */
export const matchDriverTrip: ApiHandler = async (request) => {
  const body = await parseJson(request, tripMatchRequestSchema);
  const client = await getPool().connect();
  try {
    const actor = await requireActor(client, request, ["driver"]);
    const maxDetour = body.maxDetourMinutes ?? DEFAULT_MAX_DETOUR_MINUTES;
    // A departure in the past means "leaving now".
    const departAt = new Date(Math.max(Date.now(), new Date(body.departAt).getTime()));

    const driver = await client.query<{ capacity_kg: string; load_kg: string }>(
      `SELECT driver.capacity_kg,
              COALESCE((
                SELECT sum(donation.estimated_weight_kg)
                FROM pickups AS pickup
                JOIN donations AS donation ON donation.id = pickup.donation_id
                WHERE pickup.driver_id = driver.id
                  AND pickup.status IN ('assigned', 'en_route_pickup', 'collected', 'en_route_delivery')
              ), 0) AS load_kg
       FROM drivers AS driver
       WHERE driver.id = $1`,
      [actor.profileId],
    );
    const freeKg =
      Number(driver.rows[0]?.capacity_kg ?? 0) - Number(driver.rows[0]?.load_kg ?? 0);

    const open = await client.query(
      `SELECT ${pickupSummarySelect}, NULL AS distance_km
       FROM pickups AS pickup
       ${pickupSummaryJoins("$1")}
       WHERE pickup.driver_id IS NULL
         AND pickup.status = 'awaiting_driver'
         AND donation.estimated_weight_kg <= $2
       ORDER BY pickup.created_at DESC
       LIMIT 50`,
      [actor.profileId, Math.max(0, freeKg)],
    );
    const pickups = open.rows
      .map((row) => mapPickup(row, { codes: "none" }))
      .filter((pickup): pickup is SummarizedPickup => pickup.summary !== undefined);

    const { origin, destination } = body;
    const direct = await minutesBetween([origin, destination]);
    const directMinutes = direct.matrix[0]![1]!;
    let usedAzure = direct.fromAzure;

    // Straight-line screening keeps road lookups to the most plausible few,
    // always including deliveries the driver picked.
    const roughDetour = (pickup: SummarizedPickup) =>
      estimateMinutes(origin, pickup.pickupLocation) +
      estimateMinutes(pickup.pickupLocation, pickup.deliveryLocation) +
      estimateMinutes(pickup.deliveryLocation, destination) -
      estimateMinutes(origin, destination);
    const chosen = new Set(body.pickupIds ?? []);
    const screened = [...pickups]
      .sort((left, right) => roughDetour(left) - roughDetour(right))
      .filter((pickup, index) => index < ROAD_CHECKED_CANDIDATES || chosen.has(pickup.id));

    const candidates: TripCandidate[] = await Promise.all(
      screened.map(async (pickup) => {
        const single = await minutesBetween([
          origin,
          destination,
          pickup.pickupLocation,
          pickup.deliveryLocation,
        ]);
        usedAzure ||= single.fromAzure;
        const plan = planTrip([pickup], single.matrix, () => 2, departAt);
        const detourMinutes = Math.round(plan.drivingMinutes - single.matrix[0]![1]!);
        const onTime = plan.lateMinutes === 0;
        return {
          pickupId: pickup.id,
          description: pickup.summary.description,
          weightKg: pickup.summary.estimatedWeightKg,
          rewardPoints: pickup.summary.rewardPoints,
          sellerName: pickup.summary.sellerName,
          ngoName: pickup.summary.ngoName,
          pickupPoint: pickup.pickupLocation,
          deliveryPoint: pickup.deliveryLocation,
          detourMinutes,
          onTime,
          onTheWay: onTime && detourMinutes <= maxDetour,
          pickupDeadline: pickup.summary.expiresAt,
          deliverBy: pickup.summary.deliverBy,
        };
      }),
    );
    candidates.sort(
      (left, right) =>
        Number(right.onTheWay) - Number(left.onTheWay) ||
        left.detourMinutes - right.detourMinutes ||
        right.rewardPoints - left.rewardPoints,
    );

    const byId = new Map(screened.map((pickup) => [pickup.id, pickup]));
    const combined = async (ids: string[]) => {
      const selected = ids.map((id) => byId.get(id)).filter(Boolean) as SummarizedPickup[];
      const points = [
        origin,
        destination,
        ...selected.flatMap((pickup) => [pickup.pickupLocation, pickup.deliveryLocation]),
      ];
      const { matrix, fromAzure } = await minutesBetween(points);
      usedAzure ||= fromAzure;
      const plan = planTrip(selected, matrix, (index) => 2 + index * 2, departAt);
      return { selected, points, plan, directMinutes: matrix[0]![1]! };
    };

    let selection: string[];
    if (body.pickupIds) {
      selection = body.pickupIds.filter((id) => byId.has(id));
    } else {
      // Add the best fits one by one while the whole trip stays on time,
      // within the detour limit and the free space in the vehicle.
      selection = [];
      let load = 0;
      for (const candidate of candidates) {
        if (!candidate.onTheWay || selection.length >= MAX_AUTO_JOBS) continue;
        if (load + candidate.weightKg > freeKg) continue;
        const trial = await combined([...selection, candidate.pickupId]);
        const extra = trial.plan.drivingMinutes - trial.directMinutes;
        if (trial.plan.lateMinutes === 0 && extra <= maxDetour) {
          selection.push(candidate.pickupId);
          load += candidate.weightKg;
        }
      }
    }

    const best = await combined(selection);
    const at = (minutes: number) => new Date(departAt.getTime() + minutes * 60_000).toISOString();
    const stops = [
      { kind: "origin" as const, pickupId: null, name: "Saída", point: origin, arriveAt: at(0), lateMinutes: 0 },
      ...best.plan.stops.map((stop) => {
        const pickup = byId.get(stop.jobId)!;
        return {
          kind: stop.kind,
          pickupId: stop.jobId,
          name: stop.kind === "pickup" ? pickup.summary.sellerName : pickup.summary.ngoName,
          point: best.points[stop.index]!,
          arriveAt: at(stop.arrivalMinutes),
          lateMinutes: Math.round(stop.lateMinutes),
        };
      }),
      {
        kind: "destination" as const,
        pickupId: null,
        name: "Destino",
        point: destination,
        arriveAt: at(best.plan.endArrivalMinutes ?? best.plan.drivingMinutes),
        lateMinutes: 0,
      },
    ];

    const [directRoad, tripRoad] = await Promise.all([
      routeThrough([origin, destination]).catch(() => null),
      best.selected.length
        ? routeThrough(stops.map((stop) => stop.point)).catch(() => null)
        : Promise.resolve(null),
    ]);
    const roundKm = (km: number | undefined) => (km === undefined ? null : Math.round(km * 10) / 10);

    return json(
      200,
      tripMatchSchema.parse({
        departAt: departAt.toISOString(),
        maxDetourMinutes: maxDetour,
        direct: {
          minutes: Math.round(directMinutes),
          distanceKm: roundKm(directRoad?.distanceKm),
          path: directRoad?.path ?? null,
        },
        candidates,
        plan: {
          pickupIds: best.selected.map((pickup) => pickup.id),
          stops,
          minutes: Math.round(best.plan.drivingMinutes),
          detourMinutes: Math.round(best.plan.drivingMinutes - best.directMinutes),
          distanceKm: roundKm((tripRoad ?? directRoad)?.distanceKm),
          rewardPoints: best.selected.reduce((sum, pickup) => sum + pickup.summary.rewardPoints, 0),
          weightKg: Math.round(
            best.selected.reduce((sum, pickup) => sum + pickup.summary.estimatedWeightKg, 0) * 10,
          ) / 10,
          lateMinutes: Math.round(best.plan.lateMinutes),
          path: (tripRoad ?? directRoad)?.path ?? null,
        },
        travelTimes: usedAzure ? "azure-maps" : "estimate",
      }),
    );
  } finally {
    client.release();
  }
};
