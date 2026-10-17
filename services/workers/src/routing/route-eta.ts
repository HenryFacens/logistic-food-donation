import type { GeoPoint } from "@resgata/shared";

export interface RoadRoute {
  distanceKm: number;
  etaMinutes: number;
}

// Pickup and handover time added to pure driving time.
const HANDLING_MINUTES = 10;

export interface RouteEtaProvider {
  /** Road routes from origin to each destination; null where unknown. */
  routes(origin: GeoPoint, destinations: GeoPoint[]): Promise<(RoadRoute | null)[]>;
}

export class NoRoutingProvider implements RouteEtaProvider {
  async routes(_origin: GeoPoint, destinations: GeoPoint[]) {
    return destinations.map(() => null);
  }
}

interface OsrmTableResponse {
  code: string;
  durations?: (number | null)[][];
  distances?: (number | null)[][];
}

/** OSRM table service: one request for all candidate NGOs. */
export class OsrmRoutingProvider implements RouteEtaProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 3000,
  ) {}

  async routes(origin: GeoPoint, destinations: GeoPoint[]) {
    if (destinations.length === 0) return [];
    const coordinates = [origin, ...destinations]
      .map((point) => `${point.longitude},${point.latitude}`)
      .join(";");
    const url =
      `${this.baseUrl.replace(/\/$/, "")}/table/v1/driving/${coordinates}` +
      "?sources=0&annotations=duration,distance";
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Resgata/0.1 (food donation logistics)" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new Error(`OSRM returned ${response.status}`);
      const body = (await response.json()) as OsrmTableResponse;
      if (body.code !== "Ok") throw new Error(`OSRM code ${body.code}`);
      return destinations.map((_, index) => {
        const seconds = body.durations?.[0]?.[index + 1];
        const meters = body.distances?.[0]?.[index + 1];
        if (seconds == null || meters == null) return null;
        return {
          distanceKm: meters / 1000,
          etaMinutes: Math.ceil(seconds / 60 + HANDLING_MINUTES),
        };
      });
    } catch (error) {
      console.error("[routing] OSRM unavailable, using estimates:", (error as Error).message);
      return destinations.map(() => null);
    }
  }
}

interface AzureMatrixResponse {
  matrix?: Array<
    Array<{
      statusCode?: number;
      response?: { routeSummary?: { lengthInMeters: number; travelTimeInSeconds: number } };
    }>
  >;
}

/** Azure Maps Route Matrix (sync, up to 100 cells): one origin to many NGOs. */
export class AzureMapsRoutingProvider implements RouteEtaProvider {
  constructor(
    private readonly key: string,
    private readonly fallback: RouteEtaProvider = new NoRoutingProvider(),
    private readonly timeoutMs = 5000,
  ) {}

  async routes(origin: GeoPoint, destinations: GeoPoint[]) {
    if (destinations.length === 0) return [];
    const toMultiPoint = (points: GeoPoint[]) => ({
      type: "MultiPoint",
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    });
    try {
      const url = new URL("https://atlas.microsoft.com/route/matrix/sync/json");
      url.searchParams.set("api-version", "1.0");
      url.searchParams.set("travelMode", "car");
      url.searchParams.set("subscription-key", this.key);
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origins: toMultiPoint([origin]),
          destinations: toMultiPoint(destinations.slice(0, 100)),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new Error(`Azure Maps matrix returned ${response.status}`);
      const body = (await response.json()) as AzureMatrixResponse;
      const row = body.matrix?.[0] ?? [];
      const routes = destinations.map((_, index) => {
        const summary = row[index]?.response?.routeSummary;
        if (!summary) return null;
        return {
          distanceKm: summary.lengthInMeters / 1000,
          etaMinutes: Math.ceil(summary.travelTimeInSeconds / 60 + HANDLING_MINUTES),
        };
      });
      return routes.some(Boolean) ? routes : this.fallback.routes(origin, destinations);
    } catch (error) {
      console.error("[routing] Azure Maps unavailable, falling back:", (error as Error).message);
      return this.fallback.routes(origin, destinations);
    }
  }
}
