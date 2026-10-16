import type { Role } from '@resgata/shared'
import { AppIcon, Button, Card, SimuladoBadge, StatusBadge } from '../../../shared/ui'
import {
  roleDescriptions,
  roleLabels,
  type SessionIdentity,
} from '../model/session'

const roleIcons: Record<Role, 'donation' | 'partner' | 'route' | 'user'> = {
  driver: 'route',
  ngo: 'user',
  partner: 'partner',
  seller: 'donation',
}

interface RoleCardProps {
  current: boolean
  identity: SessionIdentity
  onSelect(identity: SessionIdentity): void
}

export function RoleCard({ current, identity, onSelect }: RoleCardProps) {
  return (
    <Card className="flex min-h-64 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <AppIcon name={roleIcons[identity.role]} size={24} />
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          {current ? <StatusBadge label="Perfil atual" tone="success" /> : null}
          <SimuladoBadge />
        </div>
      </div>

      <div className="flex-1">
        <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-primary">
          {roleLabels[identity.role]}
        </p>
        <h2 className="mb-2 text-xl font-extrabold text-text">
          {identity.displayName}
        </h2>
        <p className="mb-0 text-sm">{roleDescriptions[identity.role]}</p>
      </div>

      <Button
        aria-label={`Entrar como ${identity.displayName}`}
        className="w-full"
        icon="arrow-right"
        onClick={() => onSelect(identity)}
        variant={current ? 'secondary' : 'primary'}
      >
        {current ? 'Continuar com este perfil' : `Entrar como ${roleLabels[identity.role]}`}
      </Button>
    </Card>
  )
}
