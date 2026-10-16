import type { GeoPoint } from "../schemas/common.js";

const EARTH_RADIUS_KM = 6_371.0088;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(origin: GeoPoint, destination: GeoPoint): number {
  const latitudeDelta = degreesToRadians(
    destination.latitude - origin.latitude,
  );
  const longitudeDelta = degreesToRadians(
    destination.longitude - origin.longitude,
  );
  const originLatitude = degreesToRadians(origin.latitude);
  const destinationLatitude = degreesToRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function estimateEtaMinutes(
  distanceKm: number,
  averageSpeedKmh = 30,
  handlingMinutes = 10,
): number {
  if (distanceKm < 0 || averageSpeedKmh <= 0 || handlingMinutes < 0) {
    throw new RangeError("Distance, speed, and handling values are invalid");
  }
  return Math.ceil((distanceKm / averageSpeedKmh) * 60 + handlingMinutes);
}
