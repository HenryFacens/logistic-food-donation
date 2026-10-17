import type { Pickup } from '@resgata/shared'
import { MetricValue, SimuladoBadge, StatusBadge } from '../../../shared/ui'
import {
  displayName,
  formatKg,
  formatKm,
  pickupCategoryLabels,
  pickupUrgency,
  shortAddress,
} from '../viewModels'

interface AvailablePickupCardProps {
  disabled: boolean
  now: number
  onToggle(pickupId: string): void
  pickup: Pickup
  selected: boolean
}

export function AvailablePickupCard({
  disabled,
  now,
  onToggle,
  pickup,
  selected,
}: AvailablePickupCardProps) {
  const summary = pickup.summary
  const urgency = pickupUrgency(summary?.expiresAt, now)
  const inputId = `select-pickup-${pickup.id}`

  return (
    <label
      className="delivery-card"
      data-disabled={disabled}
      data-selected={selected}
      htmlFor={inputId}
    >
      <div className="delivery-card__top">
        <StatusBadge
          icon="donation"
          label={summary?.category ? pickupCategoryLabels[summary.category] : 'Doação'}
        />
        {urgency ? (
          <StatusBadge
            icon={urgency.tone ? 'warning' : 'clock'}
            label={urgency.label}
            tone={urgency.tone ?? 'neutral'}
          />
        ) : null}
        <SimuladoBadge />
      </div>

      <div className="delivery-card__load">
        <strong className="delivery-card__weight">
          <MetricValue value={formatKg(summary?.estimatedWeightKg ?? 0)} />
        </strong>
        <p className="delivery-card__description">
          {summary?.description ?? `Doação ${pickup.donationId.slice(0, 8)}`}
        </p>
      </div>

      {summary ? (
        <>
          <ol className="delivery-route" aria-label="Rota">
            <li>
              <span className="delivery-route__marker" aria-hidden="true" />
              <div>
                <strong>{displayName(summary.sellerName)}</strong>
                <span>Retirada · {shortAddress(summary.pickupAddress)}</span>
              </div>
            </li>
            <li>
              <span className="delivery-route__marker" aria-hidden="true" />
              <div>
                <strong>{displayName(summary.ngoName)}</strong>
                <span>Entrega · {shortAddress(summary.deliveryAddress)}</span>
              </div>
            </li>
          </ol>
          <div className="delivery-card__distances">
            <span>
              Rota <span className="metric-value">{formatKm(summary.routeDistanceKm)}</span>
            </span>
            {summary.distanceToPickupKm !== null ? (
              <span>
                a <span className="metric-value">{formatKm(summary.distanceToPickupKm)}</span> de você
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="delivery-card__footer">
        <strong className="delivery-card__points metric-value" aria-label={`Recompensa de ${summary?.rewardPoints ?? 0} pontos`}>
          +{summary?.rewardPoints ?? 0} pts
        </strong>
        <span className="delivery-card__select">
          {selected ? 'Selecionada' : 'Selecionar'}
          <input
            checked={selected}
            disabled={disabled}
            id={inputId}
            onChange={() => onToggle(pickup.id)}
            type="checkbox"
          />
        </span>
      </div>
    </label>
  )
}

export function AvailablePickupSkeleton() {
  return (
    <div className="delivery-skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}
