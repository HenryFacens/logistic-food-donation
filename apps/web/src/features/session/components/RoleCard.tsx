import type { Role } from '@resgata/shared'
import { AppIcon, Button, Card, SimuladoBadge, StatusBadge } from '../../../shared/ui'
import { type SessionEntry } from '../model/session'

const roleIcons: Record<
  Role,
  'dashboard' | 'donation' | 'partner' | 'route' | 'user'
> = {
  driver: 'route',
  ngo: 'user',
  partner: 'partner',
  platform: 'dashboard',
  seller: 'donation',
}

interface RoleCardProps {
  current: boolean
  identity: SessionEntry
  onSelect(identity: SessionEntry): void
}

export function RoleCard({ current, identity, onSelect }: RoleCardProps) {
  return (
    <Card className="flex min-h-64 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-surface-raised text-text">
          <AppIcon name={roleIcons[identity.role]} size={24} />
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          {current ? <StatusBadge label="Perfil atual" tone="success" /> : null}
          <SimuladoBadge />
        </div>
      </div>

      <div className="flex-1">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">
          {identity.label}
        </p>
        <h2 className="mb-2 text-xl font-extrabold text-text">
          {identity.displayName}
        </h2>
        <p className="mb-0 text-sm">{identity.description}</p>
      </div>

      <Button
        aria-label={`Entrar em ${identity.label} como ${identity.displayName}`}
        className="w-full"
        icon="arrow-right"
        onClick={() => onSelect(identity)}
        variant={current ? 'secondary' : 'primary'}
      >
        {current ? 'Continuar com este perfil' : `Entrar em ${identity.label}`}
      </Button>
    </Card>
  )
}
