import { createElement } from 'react'
import { AdminPage } from './AdminPage'

export { AdminPage } from './AdminPage'
export { adminQueryKeys } from './queries'

export const adminRouteId = 'admin' as const
export const adminRouteElement = createElement(AdminPage)

