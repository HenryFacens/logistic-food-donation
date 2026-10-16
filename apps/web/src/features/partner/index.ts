import { createElement } from 'react'
import { PartnerPage } from './PartnerPage'

export { PartnerPage } from './PartnerPage'
export { partnerQueryKeys } from './queries'

export const partnerRouteId = 'partner' as const
export const partnerRouteElement = createElement(PartnerPage)

