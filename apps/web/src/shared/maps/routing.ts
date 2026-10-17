import type { GeoPoint } from '@resgata/shared'
import { env } from '../config/env'

export interface DrivingRoute {
  distanceKm: number
  durationMinutes: number
  /** Latitude, longitude pairs along the suggested road route. */
  path: Array<[number, number]>
}

const OSRM_ROUTE = 'https://router.project-osrm.org/route/v1/driving'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const drivingRouteKey = (origin: GeoPoint, destination: GeoPoint) => {
  const point = (value: GeoPoint) =>
    `${value.latitude.toFixed(5)},${value.longitude.toFixed(5)}`
  return `${point(origin)}>${point(destination)}`
}

export const parseOsrmRoute = (body: unknown): DrivingRoute | null => {
  if (!isRecord(body) || body.code !== 'Ok' || !Array.isArray(body.routes)) return null
  const route = body.routes[0]
  if (!isRecord(route) || !isRecord(route.geometry) || !Array.isArray(route.geometry.coordinates)) {
    return null
  }
  const distance = Number(route.distance)
  const duration = Number(route.duration)
  if (!Number.isFinite(distance) || distance < 0) return null

  const path: Array<[number, number]> = []
  for (const pair of route.geometry.coordinates) {
    if (!Array.isArray(pair) || pair.length < 2) return null
    const longitude = Number(pair[0])
    const latitude = Number(pair[1])
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    path.push([latitude, longitude])
  }
  if (path.length < 2) return null

  return {
    distanceKm: distance / 1000,
    durationMinutes: Math.max(1, Math.round((Number.isFinite(duration) ? duration : 60) / 60)),
    path,
  }
}

/** Road route through the points in order, via Azure Maps on our API. */
export async function fetchRouteThrough(
  points: readonly GeoPoint[],
  signal?: AbortSignal,
): Promise<DrivingRoute> {
  const query = points.map((point) => `${point.latitude},${point.longitude}`).join(';')
  const response = await fetch(
    `${env.apiBaseUrl}/maps/route?points=${encodeURIComponent(query)}`,
    { signal },
  )
  if (!response.ok) throw new Error(`maps/route ${response.status}`)
  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.path)) throw new Error('maps/route returned no path')
  return {
    distanceKm: Number(body.distanceKm),
    durationMinutes: Math.max(1, Math.round(Number(body.durationMinutes))),
    path: (body.path as unknown[]).flatMap((pair) =>
      Array.isArray(pair) && pair.length >= 2
        ? [[Number(pair[0]), Number(pair[1])] as [number, number]]
        : [],
    ),
  }
}

export async function fetchDrivingRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  signal?: AbortSignal,
): Promise<DrivingRoute> {
  try {
    return await fetchRouteThrough([origin, destination], signal)
  } catch (error) {
    if (signal?.aborted) throw error
    // Fall back to the public OSRM server when Azure Maps is unavailable.
  }
  const path = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
  const response = await fetch(
    `${OSRM_ROUTE}/${path}?overview=full&geometries=geojson`,
    { signal },
  )
  if (!response.ok) throw new Error(`OSRM ${response.status}`)
  const route = parseOsrmRoute(await response.json())
  if (!route) throw new Error('OSRM returned no route')
  return route
}
