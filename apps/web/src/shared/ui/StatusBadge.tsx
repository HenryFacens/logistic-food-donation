import { classes } from '../utils/classes'
import { AppIcon, type AppIconName } from './AppIcon'

export type StatusTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning'

interface StatusBadgeProps {
  icon?: AppIconName
  label: string
  tone?: StatusTone
}

const toneIcons: Record<StatusTone, AppIconName> = {
  danger: 'warning',
  info: 'wifi',
  neutral: 'user',
  success: 'check',
  warning: 'warning',
}

export function StatusBadge({
  icon,
  label,
  tone = 'neutral',
}: StatusBadgeProps) {
  return (
    <span className={classes('status-badge', `status-badge--${tone}`)}>
      <AppIcon name={icon || toneIcons[tone]} size={16} />
      <span>{label}</span>
    </span>
  )
}

