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
import 'leaflet/dist/leaflet.css'
import './maps.css'

const pin = (label: string) =>
  divIcon({
    className: 'route-map-pin',
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

export function RouteMap({
  destination,
  origin,
  path,
}: {
  destination: GeoPoint
  origin: GeoPoint
  path: ReadonlyArray<readonly [number, number]> | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useDocumentTheme()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const line: Array<[number, number]> = path
      ? path.map((point) => [point[0], point[1]])
      : [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude],
        ]
    const view = createMap(container, {
      scrollWheelZoom: false,
      zoomControl: true,
    })
    tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(view)

    const bounds = latLngBounds(line[0], line[0])
    line.forEach((point) => bounds.extend(point))
    marker([origin.latitude, origin.longitude], {
      icon: pin('R'),
      title: 'Retirada',
    }).addTo(view)
    marker([destination.latitude, destination.longitude], {
      icon: pin('E'),
      title: 'Entrega',
    }).addTo(view)
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
  }, [destination.latitude, destination.longitude, origin.latitude, origin.longitude, path])

  return (
    <div
      className={theme === 'dark' ? 'route-map route-map--dark' : 'route-map'}
      ref={containerRef}
    />
  )
}
