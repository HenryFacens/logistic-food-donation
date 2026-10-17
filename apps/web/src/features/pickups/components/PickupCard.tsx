import type {
  CreateDeliveryReceiptRequest,
  DeliveryReceipt,
  Pickup,
} from '@resgata/shared'
import { useState } from 'react'
import { AppIcon, Button, Card, StatusBadge } from '../../../shared/ui'
import { pickupErrorMessage, pickupMessages } from '../messages'
import {
  coordinateLabel,
  nextPickupAction,
  pickupProgress,
  pickupShortId,
  pickupStatusLabels,
} from '../viewModels'
import { PickupConfirmation } from './PickupConfirmation'
import { DeliveryReceiptPanel } from './DeliveryReceiptPanel'
import { RoutePreview } from './RoutePreview'

interface PickupCardProps {
  audience: 'driver' | 'ngo'
  assigning: boolean
  confirming: boolean
  creatingReceipt: boolean
  onAssign(pickupId: string): Promise<unknown>
  onConfirm: React.ComponentProps<typeof PickupConfirmation>['onConfirm']
  onCreateReceipt(input: {
    pickupId: string
    receipt: CreateDeliveryReceiptRequest
  }): Promise<DeliveryReceipt>
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
  creatingReceipt,
  onAssign,
  onConfirm,
  onCreateReceipt,
  pickup,
}: PickupCardProps) {
  const [confirmation, setConfirmation] = useState<'collect' | 'deliver' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const action = nextPickupAction(pickup)
  const progress = pickupProgress(pickup.status)
  const isActive = action === 'collect' || action === 'deliver'

  const assign = async () => {
    setError(null)
    try {
      await onAssign(pickup.id)
    } catch (caught) {
      setError(pickupErrorMessage(caught, pickupMessages.assignError))
    }
  }

  return (
    <Card className={`pickup-card ${isActive ? 'pickup-card--active' : ''}`}>
      <div className="pickup-card__heading">
        <div>
          <span className="eyebrow">Doação {pickupShortId(pickup)}</span>
          <h2>
            {audience === 'ngo'
              ? 'Recebimento em acompanhamento'
              : isActive
                ? action === 'collect' ? 'Chegue ao produtor' : 'Leve para a entidade'
                : 'Rota solidária'}
          </h2>
          <p className="pickup-card__description">{pickup.donationDescription}</p>
          <p>
            {pickup.estimatedWeightKg.toLocaleString('pt-BR')} kg estimados ·
            atualizada em {new Date(pickup.updatedAt).toLocaleString('pt-BR')}
          </p>
          {pickup.distanceKm !== undefined ? (
            <p className="pickup-card__distance">
              <strong>{pickup.distanceKm.toLocaleString('pt-BR')} km de você</strong>
            </p>
          ) : null}
        </div>
        <div className="pickup-card__status">
          <StatusBadge label={pickupStatusLabels[pickup.status]} tone={statusTone(pickup.status)} />
        </div>
      </div>

      <details className="pickup-card__details">
        <summary>
          <span>
            <AppIcon name="route" size={18} />
            {pickupMessages.detailsToggle}
          </span>
          <AppIcon name="arrow-right" size={18} />
        </summary>
        <div className="pickup-card__details-content">
          <ol className="pickup-card__timeline" aria-label="Etapas da coleta">
            {progress.map((step) => (
              <li
                className={step.complete ? 'is-complete' : step.current ? 'is-current' : ''}
                key={step.key}
              >
                <span>{step.complete ? <AppIcon name="check" size={16} /> : null}</span>
                <small>{step.label}</small>
              </li>
            ))}
          </ol>

          <RoutePreview pickup={pickup} />

          <div className="pickup-card__locations">
            <div>
              <span>Retirada cadastrada</span>
              <strong>{coordinateLabel(pickup.pickupLocation)}</strong>
            </div>
            <div>
              <span>Entrega cadastrada</span>
              <strong>{coordinateLabel(pickup.deliveryLocation)}</strong>
            </div>
          </div>
        </div>
      </details>

      {audience === 'ngo' ? (
        <div className="pickup-card__ngo-panel">
          {pickup.status !== 'delivered' && pickup.status !== 'cancelled' ? (
            <div className="pickup-card__delivery-code">
              <span>Código real para confirmar a entrega</span>
              <strong>{pickup.deliveryCode}</strong>
              <p>Informe ao coletador somente depois de conferir os alimentos no local.</p>
            </div>
          ) : null}
          {pickup.status !== 'cancelled' ? (
            <DeliveryReceiptPanel
              busy={creatingReceipt}
              onCreate={onCreateReceipt}
              pickup={pickup}
            />
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}

      {audience === 'driver' && action === 'assign' ? (
        <Button className="pickup-card__primary-action" disabled={assigning} icon="route" onClick={() => void assign()} variant="primary">
          Assumir coleta
        </Button>
      ) : null}
      {audience === 'driver' && (action === 'collect' || action === 'deliver') && !confirmation ? (
        <Button className="pickup-card__primary-action" icon="check" onClick={() => setConfirmation(action)} variant="primary">
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
