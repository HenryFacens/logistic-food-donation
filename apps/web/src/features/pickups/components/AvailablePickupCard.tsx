import type { Pickup } from '@resgata/shared'
import type { CSSProperties } from 'react'
import {
  AppIcon,
  MetricValue,
  StatusBadge,
} from '../../../shared/ui'
import {
  deliveryDeadline,
  displayDescription,
  displayName,
  formatKg,
  formatKm,
  pickupCategoryLabels,
  pickupUrgency,
  shortAddress,
} from '../viewModels'
import { PickupItems } from './PickupItems'
import { useDriverRoute } from './DriverRoute'

interface AvailablePickupCardProps {
  disabled: boolean
  index: number
  now: number
  onToggle(pickupId: string): void
  pickup: Pickup
  selected: boolean
}

export function AvailablePickupCard({
  disabled,
  index,
  now,
  onToggle,
  pickup,
  selected,
}: AvailablePickupCardProps) {
  const summary = pickup.summary
  const urgency = pickupUrgency(summary?.expiresAt, now)
  const deadline = deliveryDeadline(summary?.deliverBy, now)
  const inputId = `select-pickup-${pickup.id}`
  const route = useDriverRoute(
    pickup.pickupLocation,
    pickup.deliveryLocation,
    summary?.routeDistanceKm ?? 0,
    summary !== undefined,
  )
  const style = {
    '--stagger': Math.min(index, 8),
    // Lets the browser morph cards between positions when the sort changes.
    viewTransitionName: `pickup-${pickup.id}`,
  } as CSSProperties

  return (
    <div
      className="delivery-card"
      data-disabled={disabled}
      data-selected={selected}
      data-urgency={urgency?.tone ?? 'none'}
      style={style}
    >
      <label className="delivery-card__body" htmlFor={inputId}>
      <div className="delivery-card__top">
        <StatusBadge
          icon="package"
          label={summary?.category ? pickupCategoryLabels[summary.category] : 'Doação'}
        />
      </div>

      {summary?.items.length ? (
        <PickupItems items={summary.items} />
      ) : (
        <div className="delivery-card__load">
          <strong className="delivery-card__weight">
            <MetricValue value={formatKg(summary?.estimatedWeightKg ?? 0)} />
          </strong>
          <p className="delivery-card__description">
            {summary ? displayDescription(summary.description) : `Doação ${pickup.donationId.slice(0, 8)}`}
          </p>
        </div>
      )}

      {summary ? (
        <>
          <ol className="delivery-route" aria-label="Rota">
            <li>
              <span className="delivery-route__icon delivery-route__icon--origin" aria-hidden="true">
                <AppIcon name="pin" size={16} />
              </span>
              <div>
                <strong>{displayName(summary.sellerName)}</strong>
                <span>Retirada · {shortAddress(summary.pickupAddress)}</span>
              </div>
              {urgency ? (
                <span className="delivery-card__urgency">
                  {urgency.tone === 'danger' ? <span className="urgency-ping" aria-hidden="true" /> : null}
                  <StatusBadge
                    icon={urgency.tone ? 'warning' : 'clock'}
                    label={urgency.label}
                    tone={urgency.tone ?? 'neutral'}
                  />
                </span>
              ) : null}
            </li>
            <li>
              <span className="delivery-route__icon delivery-route__icon--destination" aria-hidden="true">
                <AppIcon name="flag" size={16} />
              </span>
              <div>
                <strong>{displayName(summary.ngoName)}</strong>
                <span>Entrega · {shortAddress(summary.deliveryAddress)}</span>
              </div>
              {deadline ? (
                <StatusBadge
                  icon={deadline.tone ? 'warning' : 'clock'}
                  label={deadline.label}
                  tone={deadline.tone ?? 'neutral'}
                />
              ) : null}
            </li>
          </ol>
          <div className="delivery-card__distances">
            <span>
              <AppIcon name="route" size={16} />
              Rota <span className="metric-value">{formatKm(route.distanceKm)}</span>
            </span>
            {summary.distanceToPickupKm !== null ? (
              <span>
                <AppIcon name="navigation" size={15} />
                a <span className="metric-value">{formatKm(summary.distanceToPickupKm)}</span> de você
              </span>
            ) : null}
            {route.toggle}
          </div>
        </>
      ) : null}

      <div className="delivery-card__footer">
        <strong
          aria-label={`Recompensa de ${summary?.rewardPoints ?? 0} pontos`}
          className="delivery-card__points metric-value"
        >
          <AppIcon name="star" size={18} />+{summary?.rewardPoints ?? 0} pts
        </strong>
        <span className="delivery-card__select">
          {selected ? 'Selecionada' : 'Selecionar'}
          <input
            checked={selected}
            className="sr-only"
            disabled={disabled}
            id={inputId}
            onChange={() => onToggle(pickup.id)}
            type="checkbox"
          />
          <span className="delivery-check" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m6 12.5 4 4 8-9" />
            </svg>
          </span>
        </span>
      </div>
      </label>
      {route.panel}
    </div>
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
