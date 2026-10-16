import type { Pickup } from '@resgata/shared'
import { useState } from 'react'
import { Button, Card, SimuladoBadge, StatusBadge } from '../../../shared/ui'
import { pickupErrorMessage, pickupMessages } from '../messages'
import {
  coordinateLabel,
  nextPickupAction,
  pickupStatusLabels,
} from '../viewModels'
import { PickupConfirmation } from './PickupConfirmation'

interface PickupCardProps {
  audience: 'driver' | 'ngo'
  assigning: boolean
  confirming: boolean
  onAssign(pickupId: string): Promise<unknown>
  onConfirm: React.ComponentProps<typeof PickupConfirmation>['onConfirm']
  pickup: Pickup
}

const statusTone = (status: Pickup['status']) => {
  if (status === 'delivered') return 'success' as const
  if (status === 'cancelled') return 'danger' as const
  if (status === 'awaiting_driver') return 'warning' as const
  return 'info' as const
}

export function PickupCard({
  audience,
  assigning,
  confirming,
  onAssign,
  onConfirm,
  pickup,
}: PickupCardProps) {
  const [confirmation, setConfirmation] = useState<'collect' | 'deliver' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const action = nextPickupAction(pickup)

  const assign = async () => {
    setError(null)
    try {
      await onAssign(pickup.id)
    } catch (caught) {
      setError(pickupErrorMessage(caught, pickupMessages.assignError))
    }
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Doação {pickup.donationId.slice(0, 8)}</span>
          <h2 className="mb-1 text-xl">
            {audience === 'ngo' ? 'Recebimento programado' : 'Rota solidária'}
          </h2>
          <p className="mb-0">Atualizada em {new Date(pickup.updatedAt).toLocaleString('pt-BR')}</p>
        </div>
        <div className="grid justify-items-end gap-2">
          <SimuladoBadge />
          <StatusBadge label={pickupStatusLabels[pickup.status]} tone={statusTone(pickup.status)} />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl bg-[rgb(var(--color-primary)/0.07)] p-4 sm:grid-cols-2">
        <div>
          <span className="block text-xs font-bold uppercase text-[rgb(var(--color-muted))]">Retirada</span>
          <strong>{coordinateLabel(pickup.pickupLocation)}</strong>
        </div>
        <div>
          <span className="block text-xs font-bold uppercase text-[rgb(var(--color-muted))]">Entrega</span>
          <strong>{coordinateLabel(pickup.deliveryLocation)}</strong>
        </div>
      </div>

      {audience === 'ngo' ? (
        <div className="rounded-2xl border border-dashed border-[rgb(var(--color-primary))] p-4">
          <span className="block text-xs font-bold uppercase text-[rgb(var(--color-muted))]">Código para confirmar entrega</span>
          <strong className="text-3xl tracking-[0.22em]">{pickup.deliveryCode}</strong>
          <p className="mb-0 mt-1 text-sm">Informe este código ao motorista somente quando os alimentos chegarem.</p>
        </div>
      ) : null}

      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}

      {audience === 'driver' && action === 'assign' ? (
        <Button disabled={assigning} icon="route" onClick={() => void assign()} variant="primary">
          Assumir coleta
        </Button>
      ) : null}
      {audience === 'driver' && (action === 'collect' || action === 'deliver') && !confirmation ? (
        <Button icon="check" onClick={() => setConfirmation(action)} variant="primary">
          {action === 'collect' ? 'Confirmar retirada' : 'Confirmar entrega'}
        </Button>
      ) : null}
      {confirmation ? (
        <PickupConfirmation
          action={confirmation}
          busy={confirming}
          onCancel={() => setConfirmation(null)}
          onConfirm={onConfirm}
          pickup={pickup}
        />
      ) : null}
    </Card>
  )
}
