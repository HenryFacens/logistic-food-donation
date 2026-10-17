import type { ReactNode } from 'react'
import './dashboard.css'

export interface DashboardHeaderProps {
  actions?: ReactNode
  description?: string
  eyebrow?: string
  periodLabel?: string
  status?: ReactNode
  title: string
}

export function DashboardHeader({
  actions,
  description,
  eyebrow,
  periodLabel,
  status,
  title,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__copy">
        {eyebrow ? <span className="dashboard-header__eyebrow">{eyebrow}</span> : null}
        <h1 className="dashboard-header__title">{title}</h1>
        {description ? (
          <p className="dashboard-header__description">{description}</p>
        ) : null}
      </div>

      {periodLabel || status || actions ? (
        <div className="dashboard-header__aside">
          {status ? <div className="dashboard-header__status">{status}</div> : null}
          {periodLabel ? (
            <p className="dashboard-header__period">
              <span>Período</span>
              <strong>{periodLabel}</strong>
            </p>
          ) : null}
          {actions ? <div className="dashboard-header__actions">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  )
}
