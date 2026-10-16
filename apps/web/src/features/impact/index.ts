import { createElement } from 'react'
import { ImpactPage } from './ImpactPage'

export { ImpactPage } from './ImpactPage'
export { impactQueryKeys } from './queries'

export const impactRouteId = 'impact' as const
export const impactRouteElement = createElement(ImpactPage)

