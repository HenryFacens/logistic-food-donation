import type { Pickup } from '@resgata/shared'
import { useState } from 'react'
import {
  AppIcon,
  Button,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../../../shared/ui'
import { usePickupActions, usePickups } from '../api/usePickups'
import { DeliveryReceiptPanel } from '../components/DeliveryReceiptPanel'
import { PickupProgress } from '../components/PickupProgress'
import { pickupMessages } from '../messages'
import { displayName, formatKg } from '../viewModels'
import { useNow } from '../hooks/useNow'
import '../pickups.css'

const ON_THE_WAY: readonly Pickup['status'][] = [
  'awaiting_driver',
  'assigned',
  'en_route_pickup',
  'collected',
  'en_route_delivery',
]

const CHECK_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

const formatWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

/** Where the food is now, in the NGO's words. */
function statusLine(pickup: Pickup) {
  const seller = displayName(pickup.summary?.sellerName ?? 'o doador')
  switch (pickup.status) {
    case 'awaiting_driver':
      return `Procurando motorista para buscar em ${seller}.`
    case 'assigned':
    case 'en_route_pickup':
      return `Motorista a caminho de ${seller}.`
    case 'collected':
    case 'en_route_delivery':
      return 'Alimentos coletados. Motorista a caminho de vocês.'
    default:
      return ''
  }
}

function DeliveryHeading({ pickup }: { pickup: Pickup }) {
  const summary = pickup.summary
  return (
    <div className="ngo-delivery__head">
      <div>
        <h3>{summary?.description ?? pickup.donationDescription}</h3>
        <p>
          {formatKg(summary?.estimatedWeightKg ?? pickup.estimatedWeightKg)} de{' '}
          {displayName(summary?.sellerName ?? 'doador')}
          {summary ? ` · ${summary.pickupAddress.district}` : ''}
        </p>
      </div>
    </div>
  )
}

function OnTheWayCard({ pickup }: { pickup: Pickup }) {
  const collected = pickup.status === 'collected' || pickup.status === 'en_route_delivery'
  return (
    <article className="screen-card ngo-delivery">
      <DeliveryHeading pickup={pickup} />
      <PickupProgress status={pickup.status} />
      <p className="ngo-delivery__status">
        <AppIcon name={collected ? 'truck' : 'clock'} size={20} />
        <span>{statusLine(pickup)}</span>
      </p>
      {pickup.deliveryCode ? (
        <div className="ngo-delivery__code">
          <span>Código de entrega</span>
          <strong className="code-value">{pickup.deliveryCode}</strong>
          <small>Diga este código ao motorista só quando os alimentos chegarem.</small>
        </div>
      ) : null}
    </article>
  )
}

function DoneRow({ pickup }: { pickup: Pickup }) {
  const receipt = pickup.receipt
  return (
    <li className="ngo-delivery-done">
      <div>
        <strong>{pickup.summary?.description ?? pickup.donationDescription}</strong>
        <span>
          {displayName(pickup.summary?.sellerName ?? 'Doador')} ·{' '}
          {formatWhen(pickup.deliveredAt ?? pickup.updatedAt)}
        </span>
      </div>
      {pickup.status === 'cancelled' ? (
        <StatusBadge label="Cancelada" tone="danger" />
      ) : receipt ? (
        <span className="ngo-delivery-done__kg">
          {formatKg(receipt.receivedWeightKg)}
          <small>conferido</small>
        </span>
      ) : (
        <span className="ngo-delivery-done__kg">
          {formatKg(pickup.summary?.estimatedWeightKg ?? pickup.estimatedWeightKg)}
          <small>estimado</small>
        </span>
      )}
    </li>
  )
}

export function NgoDeliveriesPage() {
  const pickups = usePickups('ngo', { refetchInterval: 15_000 })
  const actions = usePickupActions()
  const [showAllDone, setShowAllDone] = useState(false)
  const now = useNow(60_000)

  if (pickups.isPending) return <LoadingState label="Carregando entregas" />
  if (pickups.isError && !pickups.data) {
    return (
      <EmptyState
        action={
          <Button icon="refresh" onClick={() => void pickups.refetch()}>
            Tentar novamente
          </Button>
        }
        description={pickupMessages.loadError}
        icon="warning"
        title="Não foi possível carregar as entregas"
      />
    )
  }

  const items = pickups.data.items
  // Only recent arrivals ask for a check; older ones without one stay in history.
  const recent = (pickup: Pickup) =>
    now - new Date(pickup.deliveredAt ?? pickup.updatedAt).getTime() < CHECK_WINDOW_MS
  const toCheck = items.filter(
    (pickup) => pickup.status === 'delivered' && !pickup.receipt && recent(pickup),
  )
  const onTheWay = items.filter((pickup) => ON_THE_WAY.includes(pickup.status))
  const done = items.filter(
    (pickup) =>
      pickup.status === 'cancelled' ||
      (pickup.status === 'delivered' && (pickup.receipt || !recent(pickup))),
  )
  const doneShown = showAllDone ? done : done.slice(0, 5)

  return (
    <div className="pickups-screen pickups-screen--ngo">
      <header className="pickups-screen__header">
        <h1>Entregas</h1>
        <p>
          {toCheck.length
            ? `${toCheck.length} ${toCheck.length === 1 ? 'entrega chegou' : 'entregas chegaram'} e ${
                toCheck.length === 1 ? 'precisa' : 'precisam'
              } de conferência.`
            : onTheWay.length
              ? `${onTheWay.length} ${onTheWay.length === 1 ? 'doação a caminho' : 'doações a caminho'}.`
              : 'Nada a caminho agora. Aceite uma doação na aba Doações.'}
        </p>
      </header>

      {toCheck.length ? (
        <section className="ngo-deliveries__group">
          <h2>Para conferir</h2>
          {toCheck.map((pickup) => (
            <article className="screen-card ngo-delivery ngo-delivery--check" key={pickup.id}>
              <DeliveryHeading pickup={pickup} />
              <p className="ngo-delivery__status">
                <AppIcon name="check" size={20} />
                <span>Chegou {formatWhen(pickup.deliveredAt)}. Confira o peso e a qualidade.</span>
              </p>
              <DeliveryReceiptPanel
                busy={
                  actions.createReceipt.isPending &&
                  actions.createReceipt.variables?.pickupId === pickup.id
                }
                onCreate={actions.createReceipt.mutateAsync}
                pickup={pickup}
              />
            </article>
          ))}
        </section>
      ) : null}

      {onTheWay.length ? (
        <section className="ngo-deliveries__group">
          <h2>A caminho</h2>
          {onTheWay.map((pickup) => (
            <OnTheWayCard key={pickup.id} pickup={pickup} />
          ))}
        </section>
      ) : null}

      {!toCheck.length && !onTheWay.length ? (
        <EmptyState
          description="Quando vocês aceitarem uma doação, ela aparece aqui com o código de entrega."
          icon="truck"
          title="Nenhuma entrega a caminho"
        />
      ) : null}

      {done.length ? (
        <section className="ngo-deliveries__group">
          <h2>Recebidas</h2>
          <ul className="screen-card ngo-delivery-done-list">
            {doneShown.map((pickup) => (
              <DoneRow key={pickup.id} pickup={pickup} />
            ))}
          </ul>
          {done.length > doneShown.length ? (
            <Button onClick={() => setShowAllDone(true)} variant="ghost">
              Ver todas ({done.length})
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
