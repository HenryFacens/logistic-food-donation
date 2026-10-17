import type { Pickup } from '@resgata/shared'
import { useState } from 'react'
import {
  Button,
  Card,
  MetricValue,
  SimuladoBadge,
  StatusBadge,
} from '../../../shared/ui'
import { pickupErrorMessage, pickupMessages } from '../messages'
import {
  coordinateLabel,
  displayName,
  formatKg,
  formatKm,
  nextPickupAction,
  pickupStatusLabels,
  shortAddress,
} from '../viewModels'
import { PickupConfirmation } from './PickupConfirmation'
import { PickupProgress } from './PickupProgress'

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
  const summary = pickup.summary

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
            {summary
              ? summary.description
              : audience === 'ngo' ? 'Recebimento programado' : 'Rota solidária'}
          </h2>
          <p className="mb-0">Atualizada em {new Date(pickup.updatedAt).toLocaleString('pt-BR')}</p>
        </div>
        <div className="grid justify-items-end gap-2">
          <SimuladoBadge />
          <StatusBadge label={pickupStatusLabels[pickup.status]} tone={statusTone(pickup.status)} />
        </div>
      </div>

      <PickupProgress status={pickup.status} />

      {summary ? (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <strong className="text-2xl"><MetricValue value={formatKg(summary.estimatedWeightKg)} /></strong>
          {audience === 'driver' ? (
            <strong className="metric-value text-lg text-primary-strong">+{summary.rewardPoints} pts</strong>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-border bg-canvas p-4 sm:grid-cols-2">
        <div>
          <span className="block text-xs font-medium uppercase tracking-wider text-muted">Retirada</span>
          {summary ? (
            <>
              <strong className="block">{displayName(summary.sellerName)}</strong>
              <span className="text-sm text-muted">{shortAddress(summary.pickupAddress)}</span>
            </>
          ) : (
            <strong className="metric-value">{coordinateLabel(pickup.pickupLocation)}</strong>
          )}
        </div>
        <div>
          <span className="block text-xs font-medium uppercase tracking-wider text-muted">Entrega</span>
          {summary ? (
            <>
              <strong className="block">{displayName(summary.ngoName)}</strong>
              <span className="text-sm text-muted">
                {shortAddress(summary.deliveryAddress)} · rota{' '}
                <span className="metric-value">{formatKm(summary.routeDistanceKm)}</span>
              </span>
            </>
          ) : (
            <strong className="metric-value">{coordinateLabel(pickup.deliveryLocation)}</strong>
          )}
        </div>
      </div>

      {audience === 'ngo' && pickup.deliveryCode ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-4">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted">Código para confirmar entrega</span>
          <strong className="metric-value text-3xl tracking-[0.22em]">{pickup.deliveryCode}</strong>
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
