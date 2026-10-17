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
