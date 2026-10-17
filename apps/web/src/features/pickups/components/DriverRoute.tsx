import type { GeoPoint } from '@resgata/shared'
import { useState, type ReactNode } from 'react'
import { RouteMap, useDrivingRoute } from '../../../shared/maps'
import { AppIcon } from '../../../shared/ui'
import '../../../shared/maps/maps.css'

export function useDriverRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  fallbackKm: number,
  active: boolean,
) {
  const driving = useDrivingRoute(origin, destination, active)
  const [open, setOpen] = useState(false)
  const distanceKm = driving.route?.distanceKm ?? fallbackKm

  const toggle: ReactNode = driving.enabled ? (
    <button
      aria-pressed={open}
      className="route-map-toggle"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setOpen((current) => !current)
      }}
      type="button"
    >
      <AppIcon name="navigation" size={15} />
      Ver mapa
    </button>
  ) : null

  const panel: ReactNode = open ? (
    <div className="route-map-panel">
      <RouteMap destination={destination} origin={origin} path={driving.route?.path ?? null} />
    </div>
  ) : null

  return { distanceKm, panel, toggle }
}
