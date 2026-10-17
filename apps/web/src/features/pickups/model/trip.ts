import type { GeoPoint } from '@resgata/shared'

/** The trip the driver is making today, so their route ends where they go. */
export interface SavedTrip {
  origin: GeoPoint
  destination: GeoPoint
  destinationLabel: string
  departAt: string
}

const KEY = 'resgata.driver-trip'
/** A trip is about today: forget it after 12 hours. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

export const saveTrip = (trip: SavedTrip) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(trip))
  } catch {
    // The route plan simply ends at the last delivery.
  }
}

export const loadTrip = (): SavedTrip | null => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const trip = JSON.parse(raw) as SavedTrip
    if (Date.now() - new Date(trip.departAt).getTime() > MAX_AGE_MS) return null
    return trip
  } catch {
    return null
  }
}

export const clearTrip = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored.
  }
}
