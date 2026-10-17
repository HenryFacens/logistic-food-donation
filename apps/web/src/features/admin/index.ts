import { createElement } from 'react'
import { AdminPage } from './AdminPage'

export { AdminPage } from './AdminPage'
export { PlatformDashboardPage } from './PlatformDashboardPage'
export {
  adminQueryKeys,
  usePlatformDashboardQuery,
} from './queries'

export const adminRouteId = 'admin' as const
export const adminRouteElement = createElement(AdminPage)
