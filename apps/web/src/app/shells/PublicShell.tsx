import type { ReactNode } from 'react'
import { ThemeToggle } from './ShellControls'

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      {window.location.pathname === '/entrar' ? (
        <header className="public-shell__header">
          <a className="brand" href="/hoje" aria-label="Resgata — início">
            <img src="/logo.svg" alt="" width="40" height="40" />
            <span>Resgata</span>
          </a>
          <ThemeToggle />
        </header>
      ) : null}
      <main className="public-shell__content">{children}</main>
    </div>
  )
}
