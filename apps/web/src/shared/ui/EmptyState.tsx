import type { ReactNode } from 'react'
import { AppIcon, type AppIconName } from './AppIcon'

interface EmptyStateProps {
  action?: ReactNode
  description: string
  icon?: AppIconName
  title: string
}

export function EmptyState({
  action,
  description,
  icon = 'donation',
  title,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <AppIcon name={icon} size={28} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}

