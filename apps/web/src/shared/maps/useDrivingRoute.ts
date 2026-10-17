import type { GeoPoint } from '@resgata/shared'
import { useEffect, useState } from 'react'
import { drivingRouteKey, fetchDrivingRoute, type DrivingRoute } from './routing'

export type { DrivingRoute }

export interface DrivingRouteState {
  enabled: boolean
  route: DrivingRoute | null
  status: 'error' | 'idle' | 'loading' | 'ready'
}

const cache = new Map<string, Promise<DrivingRoute>>()

const requestDrivingRoute = (origin: GeoPoint, destination: GeoPoint) => {
  const key = drivingRouteKey(origin, destination)
  const existing = cache.get(key)
  if (existing) return existing

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)
  const pending = fetchDrivingRoute(origin, destination, controller.signal).finally(() => {
    window.clearTimeout(timeout)
  })
  cache.set(key, pending)
  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key)
  })
  return pending
}

export function useDrivingRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  active = true,
): DrivingRouteState {
  const originLatitude = origin.latitude
  const originLongitude = origin.longitude
  const destinationLatitude = destination.latitude
  const destinationLongitude = destination.longitude
  const key = drivingRouteKey(
    { latitude: originLatitude, longitude: originLongitude },
    { latitude: destinationLatitude, longitude: destinationLongitude },
  )
  const [stored, setStored] = useState<{
    key: string
    route: DrivingRoute | null
    status: 'error' | 'ready'
  } | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    requestDrivingRoute(
      { latitude: originLatitude, longitude: originLongitude },
      { latitude: destinationLatitude, longitude: destinationLongitude },
    )
      .then((route) => {
        if (!cancelled) setStored({ key, route, status: 'ready' })
      })
      .catch(() => {
        if (!cancelled) setStored({ key, route: null, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [
    active,
    destinationLatitude,
    destinationLongitude,
    key,
    originLatitude,
    originLongitude,
  ])

  if (!active) return { enabled: false, route: null, status: 'idle' }
  if (!stored || stored.key !== key) {
    return { enabled: true, route: null, status: 'loading' }
  }
  return { enabled: true, route: stored.route, status: stored.status }
}
