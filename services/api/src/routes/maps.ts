import { geoPointSchema } from "@resgata/shared";
import { z } from "zod";
import { fetchTile, routeThrough, searchAddresses } from "../azure-maps.js";
import { ApiError } from "../errors.js";
import { json, type ApiHandler } from "../http.js";

// Public endpoints: Leaflet <img> tiles cannot send auth headers. The Azure
// Maps key stays on the server; the gateway rate-limits /api per client.

const tileParams = z.object({
  z: z.coerce.number().int().min(0).max(19),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
});

export const getMapTile: ApiHandler = async (request) => {
  const { z: zoom, x, y } = tileParams.parse(request.params);
  const style = request.query.get("style") === "light" ? "light" : "dark";
  const tile = await fetchTile(zoom, x, y, style);
  return {
    status: 200,
    body: tile.data,
    headers: {
      "content-type": tile.contentType,
      "cache-control": "public, max-age=604800, immutable",
    },
  };
};

const MAX_ROUTE_POINTS = 25;

/** ?points=lat,lon;lat,lon;... -> road route through the points in order. */
export const getMapRoute: ApiHandler = async (request) => {
  const raw = (request.query.get("points") ?? "").split(";").filter(Boolean);
  if (raw.length < 2 || raw.length > MAX_ROUTE_POINTS) {
    throw new ApiError(422, "invalid_route", `Informe de 2 a ${MAX_ROUTE_POINTS} pontos.`);
  }
  const points = raw.map((pair) => {
    const [latitude, longitude] = pair.split(",").map(Number);
    return geoPointSchema.parse({ latitude, longitude });
  });
  return json(200, await routeThrough(points));
};

export const getAddressSuggestions: ApiHandler = async (request) => {
  const query = (request.query.get("q") ?? "").trim();
  if (query.length < 3) return json(200, { items: [] });
  return json(200, { items: await searchAddresses(query.slice(0, 120)) });
};
