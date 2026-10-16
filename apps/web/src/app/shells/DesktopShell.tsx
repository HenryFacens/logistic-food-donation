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
  const { role, user } = useSession()
  const navigation = role ? navigationForRole(role, 'desktop') : []

  return (
    <div className="desktop-shell">
      <aside className="desktop-shell__sidebar">
        <a className="brand" href="/" aria-label="Resgata — início">
          <img src="/logo.svg" alt="" width="44" height="44" />
          <span>Resgata</span>
        </a>
        <nav aria-label="Navegação principal">
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
        <SessionControl />
      </aside>
      <div className="desktop-shell__main">
        <header className="desktop-shell__topbar">
          <div>
            <span className="eyebrow">{user?.displayName}</span>
            <h1>{route.title}</h1>
          </div>
          <div className="desktop-shell__actions">
            <LiveStatus />
            <ThemeToggle />
          </div>
        </header>
        <main className="desktop-shell__content">{children}</main>
      </div>
    </div>
  )
}

