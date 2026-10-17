import type { Address, GeoPoint } from "@resgata/shared";
import { getConfig } from "./config.js";
import { ApiError } from "./errors.js";

const ATLAS = "https://atlas.microsoft.com";
const TIMEOUT_MS = 8000;
// Campinas: bias address suggestions toward the operating area.
const BIAS = { latitude: -22.9056, longitude: -47.0608 };

export const azureMapsEnabled = () => Boolean(getConfig().AZURE_MAPS_KEY);

function keyOrThrow(): string {
  const key = getConfig().AZURE_MAPS_KEY;
  if (!key) {
    throw new ApiError(503, "maps_unavailable", "O serviço de mapas não está configurado.");
  }
  return key;
}

async function atlas(path: string, params: Record<string, string>, init?: RequestInit) {
  const url = new URL(path, ATLAS);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("subscription-key", keyOrThrow());
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Azure Maps ${path} returned ${response.status}`);
  }
  return response;
}

export type TileStyle = "dark" | "light";

/** Raster base-map tile (256 px) for Leaflet. */
export async function fetchTile(z: number, x: number, y: number, style: TileStyle) {
  const response = await atlas("/map/tile", {
    "api-version": "2024-04-01",
    tilesetId: style === "dark" ? "microsoft.base.darkgrey" : "microsoft.base.road",
    zoom: String(z),
    x: String(x),
    y: String(y),
    tileSize: "256",
    language: "pt-BR",
  });
  return {
    data: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "image/png",
  };
}

export interface DrivingRoute {
  distanceKm: number;
  durationMinutes: number;
  /** [latitude, longitude] pairs along the road route. */
  path: Array<[number, number]>;
  /** Per-leg distance/time between consecutive points. */
  legs: Array<{ distanceKm: number; durationMinutes: number }>;
}

interface RouteDirectionsResponse {
  routes?: Array<{
    summary: { lengthInMeters: number; travelTimeInSeconds: number };
    legs: Array<{
      summary: { lengthInMeters: number; travelTimeInSeconds: number };
      points: Array<{ latitude: number; longitude: number }>;
    }>;
  }>;
}

/** Road route through the points, in order (2-150 points). */
export async function routeThrough(points: GeoPoint[]): Promise<DrivingRoute> {
  if (points.length < 2) throw new ApiError(422, "invalid_route", "Informe ao menos dois pontos.");
  const response = await atlas("/route/directions/json", {
    "api-version": "1.0",
    travelMode: "car",
    routeRepresentation: "polyline",
    language: "pt-BR",
    query: points.map((point) => `${point.latitude},${point.longitude}`).join(":"),
  });
  const body = (await response.json()) as RouteDirectionsResponse;
  const route = body.routes?.[0];
  if (!route) throw new Error("Azure Maps returned no route");
  return {
    distanceKm: route.summary.lengthInMeters / 1000,
    durationMinutes: Math.max(1, Math.round(route.summary.travelTimeInSeconds / 60)),
    path: route.legs.flatMap((leg) =>
      leg.points.map((point): [number, number] => [point.latitude, point.longitude]),
    ),
    legs: route.legs.map((leg) => ({
      distanceKm: leg.summary.lengthInMeters / 1000,
      durationMinutes: leg.summary.travelTimeInSeconds / 60,
    })),
  };
}

interface AzureAddress {
  streetName?: string;
  streetNumber?: string;
  municipalitySubdivision?: string;
  municipality?: string;
  countrySubdivisionCode?: string;
  postalCode?: string;
  extendedPostalCode?: string;
  countryCode?: string;
}

const UNKNOWN_POSTAL_CODE = "00000-000";

function toAddress(address: AzureAddress, position: GeoPoint): Address | null {
  if (address.countryCode && address.countryCode !== "BR") return null;
  const street = address.streetName?.trim();
  if (!street) return null;
  const cepDigits = (address.extendedPostalCode ?? "").replace(/\D/g, "").slice(0, 8);
  return {
    line1: [street, address.streetNumber].filter(Boolean).join(", "),
    district: address.municipalitySubdivision?.trim() || "Centro",
    city: address.municipality?.trim() || "Campinas",
    state: (address.countrySubdivisionCode || "SP").slice(0, 2).toUpperCase(),
    postalCode:
      cepDigits.length === 8
        ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`
        : UNKNOWN_POSTAL_CODE,
    location: position,
  };
}

/** Address suggestions for typeahead, biased to Campinas. */
export async function searchAddresses(query: string, limit = 6): Promise<Address[]> {
  const response = await atlas("/search/address/json", {
    "api-version": "1.0",
    query,
    countrySet: "BR",
    language: "pt-BR",
    typeahead: "true",
    limit: String(limit),
    lat: String(BIAS.latitude),
    lon: String(BIAS.longitude),
  });
  const body = (await response.json()) as {
    results?: Array<{ address: AzureAddress; position: { lat: number; lon: number } }>;
  };
  return (body.results ?? []).flatMap((result) => {
    const address = toAddress(result.address, {
      latitude: result.position.lat,
      longitude: result.position.lon,
    });
    return address ? [address] : [];
  });
}

/** Street address at a GPS position. */
export async function reverseAddress(point: GeoPoint): Promise<Address | null> {
  const response = await atlas("/search/address/reverse/json", {
    "api-version": "1.0",
    query: `${point.latitude},${point.longitude}`,
    language: "pt-BR",
  });
  const body = (await response.json()) as {
    addresses?: Array<{ address: AzureAddress }>;
  };
  const first = body.addresses?.[0];
  return first ? toAddress(first.address, point) : null;
}

export const azureMapsInternals = { toAddress };

/**
 * All-pairs driving minutes between the points (Azure Maps sync matrix,
 * up to 10 points / 100 cells). Returns null when unavailable.
 */
export async function travelMinutesMatrix(points: GeoPoint[]): Promise<number[][] | null> {
  if (!azureMapsEnabled() || points.length < 2 || points.length > 10) return null;
  const multiPoint = {
    type: "MultiPoint",
    coordinates: points.map((point) => [point.longitude, point.latitude]),
  };
  try {
    const response = await atlas(
      "/route/matrix/sync/json",
      { "api-version": "1.0", travelMode: "car" },
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origins: multiPoint, destinations: multiPoint }),
      },
    );
    const body = (await response.json()) as {
      matrix?: Array<Array<{ response?: { routeSummary?: { travelTimeInSeconds: number } } }>>;
    };
    if (!body.matrix) return null;
    return body.matrix.map((row, from) =>
      row.map((cell, to) =>
        from === to ? 0 : (cell.response?.routeSummary?.travelTimeInSeconds ?? Number.NaN) / 60,
      ),
    );
  } catch (error) {
    console.error("[maps] travel matrix unavailable:", (error as Error).message);
    return null;
  }
}
