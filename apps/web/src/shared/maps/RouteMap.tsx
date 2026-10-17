import type { GeoPoint } from '@resgata/shared'
import {
  divIcon,
  latLngBounds,
  map as createMap,
  marker,
  polyline,
  tileLayer,
} from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { env } from '../config/env'
import 'leaflet/dist/leaflet.css'
import './maps.css'

const pin = (label: string, tone: 'pickup' | 'delivery' | 'start' = 'pickup') =>
  divIcon({
    className: `route-map-pin route-map-pin--${tone}`,
    html: `<span>${label}</span>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  })

const useDocumentTheme = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  )

  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    }
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributeFilter: ['data-theme'],
      attributes: true,
    })
    return () => observer.disconnect()
  }, [])

  return theme
}

export interface RouteMapStop {
  point: GeoPoint
  /** Short pin label, e.g. "1" or "R". */
  label: string
  title: string
  tone?: 'pickup' | 'delivery' | 'start'
}

interface RouteMapProps {
  /** Two-point mode (pickup → delivery). Ignored when `stops` is given. */
  origin?: GeoPoint
  destination?: GeoPoint
  /** Ordered stops of a multi-stop route. */
  stops?: readonly RouteMapStop[]
  /** Road geometry as [latitude, longitude]; straight segments when null. */
  path: ReadonlyArray<readonly [number, number]> | null
}

// Azure Maps tiles through our API (the key never reaches the browser);
// OpenStreetMap is the fallback if the proxy is unavailable.
const azureTiles = (theme: 'dark' | 'light') =>
  `${env.apiBaseUrl}/maps/tile/{z}/{x}/{y}?style=${theme}`
const AZURE_ATTRIBUTION = '© Microsoft Azure Maps, © TomTom'
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export function RouteMap({ destination, origin, path, stops }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useDocumentTheme()
  const [usingFallbackTiles, setUsingFallbackTiles] = useState(false)

  const pins: RouteMapStop[] =
    stops && stops.length
      ? [...stops]
      : origin && destination
        ? [
            { label: 'R', point: origin, title: 'Retirada', tone: 'pickup' },
            { label: 'E', point: destination, title: 'Entrega', tone: 'delivery' },
          ]
        : []
  const pinsKey = pins
    .map((stop) => `${stop.label}:${stop.point.latitude},${stop.point.longitude}`)
    .join('|')

  useEffect(() => {
    const container = containerRef.current
    if (!container || pins.length === 0) return
    const line: Array<[number, number]> = path
      ? path.map((point) => [point[0], point[1]])
      : pins.map((stop) => [stop.point.latitude, stop.point.longitude])
    const view = createMap(container, {
      scrollWheelZoom: false,
      zoomControl: true,
    })

    let fellBack = false
    const azure = tileLayer(azureTiles(theme), {
      attribution: AZURE_ATTRIBUTION,
      maxZoom: 19,
    })
    azure.on('tileerror', () => {
      if (fellBack) return
      fellBack = true
      view.removeLayer(azure)
      tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(view)
      setUsingFallbackTiles(true)
    })
    azure.addTo(view)

    const bounds = latLngBounds(line[0], line[0])
    line.forEach((point) => bounds.extend(point))
    for (const stop of pins) {
      const position: [number, number] = [stop.point.latitude, stop.point.longitude]
      bounds.extend(position)
      marker(position, { icon: pin(stop.label, stop.tone), title: stop.title }).addTo(view)
    }
    polyline(line, {
      color: '#34d399',
      opacity: 0.95,
      weight: 5,
    }).addTo(view)
    view.fitBounds(bounds, { maxZoom: 16, padding: [24, 24] })
    const frame = window.requestAnimationFrame(() => view.invalidateSize())

    return () => {
      window.cancelAnimationFrame(frame)
      view.remove()
    }
    // pinsKey captures the stop positions and labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey, path, theme])

  return (
    <div
      className={
        // Only the OpenStreetMap fallback needs the dark-mode color inversion;
        // Azure Maps serves a native dark style.
        theme === 'dark' && usingFallbackTiles ? 'route-map route-map--dark' : 'route-map'
      }
      ref={containerRef}
    />
  )
}
