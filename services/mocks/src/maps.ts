import type { FastifyInstance } from "fastify";

import type { GeoPoint } from "./types.js";

interface RouteBody {
  origin?: GeoPoint;
  destination?: GeoPoint;
}

function isPoint(value: unknown): value is GeoPoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const latitude = Reflect.get(value, "latitude");
  const longitude = Reflect.get(value, "longitude");
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function haversineKm(origin: GeoPoint, destination: GeoPoint): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function routeResponse(origin: GeoPoint, destination: GeoPoint) {
  const distanceKm = Number(haversineKm(origin, destination).toFixed(3));
  const durationMinutes = Math.max(1, Math.ceil((distanceKm / 28) * 60));

  return {
    origin,
    destination,
    distanceKm,
    durationMinutes,
    provider: "haversine-mock",
    simulated: true,
    label: "SIMULADO",
  };
}

export async function registerMapsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: RouteBody }>("/route", async (request, reply) => {
    if (!isPoint(request.body?.origin) || !isPoint(request.body?.destination)) {
      return reply.code(400).send({
        error: {
          code: "INVALID_ROUTE_POINTS",
          message: "origin and destination must contain valid coordinates",
        },
      });
    }

    return routeResponse(request.body.origin, request.body.destination);
  });
}
