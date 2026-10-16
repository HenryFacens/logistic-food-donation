import { NgoOffersPage } from './pages/NgoOffersPage'

export const ngoOffersRouteElement = <NgoOffersPage />

export const offersRouteElements = {
  'ngo-offers': ngoOffersRouteElement,
} as const
