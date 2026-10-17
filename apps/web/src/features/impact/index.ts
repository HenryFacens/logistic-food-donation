import { createElement } from 'react'
import { ImpactPage } from './ImpactPage'

export { ImpactPage } from './ImpactPage'
export { SellerMetricsPage } from './SellerMetricsPage'
export {
  createDriverRatingSubmission,
  impactQueryKeys,
  useDriverRatingOpportunitiesQuery,
  useImpactDashboardQuery,
  useImpactForecastQuery,
  useSellerDashboardQuery,
  useSubmitDriverRatingMutation,
  type SubmitDriverRatingInput,
} from './queries'

export const impactRouteId = 'impact' as const
export const impactRouteElement = createElement(ImpactPage)
