import type { ReactNode } from 'react'
import type { AppRoute } from '../router/contract'
import { AppIcon, AppLink } from '../../shared/ui'
import { navigationForRole } from '../router/contract'
import { useSession } from '../providers'
import { LiveStatus, SessionControl, ThemeToggle } from './ShellControls'

interface DesktopShellProps {
  children: ReactNode
  route: AppRoute
}

export function DesktopShell({ children, route }: DesktopShellProps) {
  const { role } = useSession()
  const navigation = role ? navigationForRole(role, 'desktop') : []

  return (
    <div className="desktop-shell">
      <header className="desktop-shell__header">
        <a className="brand" href="/" aria-label="Resgata — início">
          <img src="/logo.svg" alt="" width="44" height="44" />
          <span>Resgata</span>
        </a>
        <nav className="desktop-shell__nav" aria-label="Navegação principal">
          {navigation.map((item) => (
            <AppLink
              aria-current={item.path === route.path ? 'page' : undefined}
              className="desktop-nav-link"
              href={item.path}
              key={item.id}
            >
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
            </AppLink>
          ))}
        </nav>
        <div className="desktop-shell__actions">
          <LiveStatus />
          <ThemeToggle />
          <SessionControl />
        </div>
      </header>
      <div className="desktop-shell__main">
        <main className="desktop-shell__content">{children}</main>
      </div>
    </div>
  )
}
