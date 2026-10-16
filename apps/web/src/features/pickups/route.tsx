import {
  DriverPickupsPage,
  NgoPickupsPage,
} from './pages/PickupListPage'

export const ngoPickupsRouteElement = <NgoPickupsPage />
export const driverPickupsRouteElement = <DriverPickupsPage />

export const pickupRouteElements = {
  'driver-pickups': driverPickupsRouteElement,
  'ngo-pickups': ngoPickupsRouteElement,
} as const
