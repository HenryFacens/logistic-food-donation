import { DriverDeliveriesPage } from './pages/DriverDeliveriesPage'
import { NgoDeliveriesPage } from './pages/NgoDeliveriesPage'

export const ngoPickupsRouteElement = <NgoDeliveriesPage />
export const driverPickupsRouteElement = <DriverDeliveriesPage />

export const pickupRouteElements = {
  'driver-pickups': driverPickupsRouteElement,
  'ngo-pickups': ngoPickupsRouteElement,
} as const
