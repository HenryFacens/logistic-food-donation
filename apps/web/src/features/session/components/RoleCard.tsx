import type { Role } from '@resgata/shared'
import { AppIcon } from '../../../shared/ui'
import { type SessionEntry } from '../model/session'

const roleIcons: Record<Role, 'chart' | 'heart' | 'partner' | 'truck' | 'home'> = {
  driver: 'truck',
  ngo: 'home',
  partner: 'partner',
  platform: 'chart',
  seller: 'heart',
}

interface RoleCardProps {
  current: boolean
  identity: SessionEntry
  onSelect(identity: SessionEntry): void
  /** Secondary entries (dashboards) render as a compact row. */
  compact?: boolean
}

/** The whole card is one large button: pick who you are and go. */
export function RoleCard({ compact = false, current, identity, onSelect }: RoleCardProps) {
  const icon = identity.entryPoint === 'ngo-analytics' ? 'chart' : roleIcons[identity.role]
  return (
    <button
      aria-label={`Entrar como ${identity.label}: ${identity.displayName}`}
      className={`role-card${compact ? ' role-card--compact' : ''}${current ? ' is-current' : ''}`}
      onClick={() => onSelect(identity)}
      type="button"
    >
      <span className={`role-card__icon role-card__icon--${identity.role}`}>
        <AppIcon name={icon} size={compact ? 22 : 28} />
      </span>
      <span className="role-card__copy">
        <strong>{identity.label}</strong>
        <span className="role-card__name">{identity.displayName}</span>
        {compact ? null : <span className="role-card__description">{identity.description}</span>}
        {current ? <span className="role-card__current">Perfil atual</span> : null}
      </span>
      <AppIcon name="arrow-right" size={22} />
    </button>
  )
}
