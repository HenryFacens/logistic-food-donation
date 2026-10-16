import type { ReactNode } from 'react'
import type { AppRoute } from '../router/contract'
import { AppIcon, AppLink } from '../../shared/ui'
import { navigationForRole } from '../router/contract'
import { useSession } from '../providers'
import { OfflineBanner, SyncQueueBadge } from './OfflineIndicators'
import { SessionControl, ThemeToggle } from './ShellControls'

interface MobileShellProps {
  children: ReactNode
  route: AppRoute
}

export function MobileShell({ children, route }: MobileShellProps) {
  const { role, user } = useSession()
  const navigation = role ? navigationForRole(role, 'mobile') : []

  return (
    <div className="mobile-shell">
      <header className="mobile-shell__header">
        <div>
          <span className="eyebrow">{user?.displayName}</span>
          <h1>{route.title}</h1>
        </div>
        <ThemeToggle />
      </header>
      <OfflineBanner />
      <div className="mobile-shell__queue">
        <SyncQueueBadge />
      </div>
      <main className="mobile-shell__content">{children}</main>
      <footer className="mobile-shell__footer">
        <nav aria-label="Navegação principal">
          {navigation.map((item) => (
            <AppLink
              aria-current={item.path === route.path ? 'page' : undefined}
              className="mobile-nav-link"
              href={item.path}
              key={item.id}
            >
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
            </AppLink>
          ))}
          <SessionControl />
        </nav>
      </footer>
    </div>
  )
}

