import { DriverDeliveriesPage } from './pages/DriverDeliveriesPage'
import { NgoPickupsPage } from './pages/PickupListPage'

export const ngoPickupsRouteElement = <NgoPickupsPage />
export const driverPickupsRouteElement = <DriverDeliveriesPage />

export const pickupRouteElements = {
  'driver-pickups': driverPickupsRouteElement,
  'ngo-pickups': ngoPickupsRouteElement,
} as const
