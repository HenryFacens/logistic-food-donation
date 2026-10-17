import {
  driverAvailabilityRequestSchema,
  geoPointSchema,
  updateSellerProfileRequestSchema,
} from "@resgata/shared";
import { requireActor } from "../auth.js";
import { getPool } from "../db.js";
import { ApiError } from "../errors.js";
import { lookupCep, reverseGeocode } from "../geo.js";
import { json, parseJson, pathUuid, type ApiHandler } from "../http.js";
import { readPhoto } from "../photos.js";

async function withActor<T>(
  request: Parameters<ApiHandler>[0],
  roles: Parameters<typeof requireActor>[2],
  run: (
    client: import("pg").PoolClient,
    actor: Awaited<ReturnType<typeof requireActor>>,
  ) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await run(client, await requireActor(client, request, roles));
  } finally {
    client.release();
  }
}

// Photo ids are random UUIDs, so the path works as a capability link that
// <img> tags can load without auth headers.
export const getPhoto: ApiHandler = async (request) => {
  const photo = await readPhoto(pathUuid(request, "photoId"));
  return {
    status: 200,
    body: photo.data,
    headers: {
      "content-type": photo.contentType,
      "cache-control": "private, max-age=86400, immutable",
    },
  };
};

export const getCepAddress: ApiHandler = async (request) =>
  withActor(request, undefined, async () =>
    json(200, await lookupCep(request.params.cep ?? "")),
  );

export const getReverseAddress: ApiHandler = async (request) =>
  withActor(request, undefined, async () => {
    const point = geoPointSchema.parse({
      latitude: Number(request.query.get("lat")),
      longitude: Number(request.query.get("lon")),
    });
    return json(200, await reverseGeocode(point));
  });

const sellerProfileSql = `
  SELECT id, legal_name AS "legalName", address
  FROM sellers
  WHERE id = $1`;

export const getSellerProfile: ApiHandler = async (request) =>
  withActor(request, ["seller"], async (client, actor) => {
    const result = await client.query(sellerProfileSql, [actor.profileId]);
    return json(200, result.rows[0]);
  });

export const updateSellerProfile: ApiHandler = async (request) => {
  const body = await parseJson(request, updateSellerProfileRequestSchema);
  return withActor(request, ["seller"], async (client, actor) => {
    await client.query(
      `UPDATE sellers
       SET address = $2::jsonb,
           location = ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
       WHERE id = $1`,
      [
        actor.profileId,
        JSON.stringify(body.address),
        body.address.location.longitude,
        body.address.location.latitude,
      ],
    );
    const result = await client.query(sellerProfileSql, [actor.profileId]);
    return json(200, result.rows[0]);
  });
};

const driverStatusSql = `
  SELECT
    id,
    active AS available,
    capacity_kg::float8 AS "capacityKg",
    points,
    json_build_object(
      'latitude', ST_Y(current_location::geometry),
      'longitude', ST_X(current_location::geometry)
    ) AS "currentLocation"
  FROM drivers
  WHERE id = $1`;

export const getDriverStatus: ApiHandler = async (request) =>
  withActor(request, ["driver"], async (client, actor) => {
    const result = await client.query(driverStatusSql, [actor.profileId]);
    return json(200, result.rows[0]);
  });

export const updateDriverStatus: ApiHandler = async (request) => {
  const body = await parseJson(request, driverAvailabilityRequestSchema);
  return withActor(request, ["driver"], async (client, actor) => {
    const updated = await client.query(
      `UPDATE drivers
       SET active = $2,
           current_location = CASE
             WHEN $3::float8 IS NULL THEN current_location
             ELSE ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
           END
       WHERE id = $1`,
      [
        actor.profileId,
        body.available,
        body.location?.longitude ?? null,
        body.location?.latitude ?? null,
      ],
    );
    if (!updated.rowCount) {
      throw new ApiError(404, "not_found", "Motorista não encontrado.");
    }
    const result = await client.query(driverStatusSql, [actor.profileId]);
    return json(200, result.rows[0]);
  });
};
