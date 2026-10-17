import {
  COLLECTION_REWARD_POINTS,
  calculateRewardPoints,
  type GeoPoint,
  type Pickup,
} from '@resgata/shared'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import {
  AppIcon,
  Button,
  EmptyState,
  LottiePlayer,
  MetricValue,
  useToast,
} from '../../../shared/ui'
import routeAnimation from '../animations/route.json'
import {
  useCurrentProfile,
  usePickupActions,
  usePickups,
} from '../api/usePickups'
import {
  AvailablePickupCard,
  AvailablePickupSkeleton,
} from '../components/AvailablePickupCard'
import { DriverAvailability } from '../components/DriverAvailability'
import { PickupCard } from '../components/PickupCard'
import { SelectionBar } from '../components/SelectionBar'
import { SuccessBurst, type Celebration } from '../components/SuccessBurst'
import { pickupMessages } from '../messages'
import {
  acceptOutcomeMessage,
  acceptOutcomeTone,
  capacityCheck,
  displayName,
  formatKg,
  selectionSummaryLabel,
  selectionTotals,
  sortAvailablePickups,
  splitDriverPickups,
  type AvailableSort,
  type DriverTab,
} from '../viewModels'
import '../pickups.css'

// Unassigned pickups emit no SSE event visible to drivers, so poll this tab.
const AVAILABLE_REFETCH_MS = 15_000

const useNow = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Morphs the cards into their new order where View Transitions exist. */
const withViewTransition = (update: () => void) => {
  const start = (
    document as Document & { startViewTransition?: (callback: () => void) => unknown }
  ).startViewTransition
  if (!start || reducedMotion()) {
    update()
    return
  }
  start.call(document, () => flushSync(update))
}

export function DriverDeliveriesPage() {
  const [tab, setTab] = useState<DriverTab>('available')
  const [sort, setSort] = useState<AvailableSort>('urgency')
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const pickups = usePickups('driver', {
    refetchInterval: tab === 'available' ? AVAILABLE_REFETCH_MS : false,
  })
  const profile = useCurrentProfile()
  const actions = usePickupActions()
  const toast = useToast()
  const now = useNow(30_000)
  const clearCelebration = useCallback(() => setCelebration(null), [])

  const groups = useMemo(
    () => splitDriverPickups(pickups.data?.items ?? [], profile.data?.profileId),
    [pickups.data, profile.data?.profileId],
  )
  const available = useMemo(
    () => sortAvailablePickups(groups.available, sort),
    [groups.available, sort],
  )
  // Pickups taken elsewhere disappear from the list and from the selection.
  const selected = useMemo(
    () => available.filter((pickup) => selectedIds.has(pickup.id)),
    [available, selectedIds],
  )
  const totals = selectionTotals(selected)
  // Food already on board (accepted or collected, not yet delivered) counts too.
  const loadKg = selectionTotals(groups.active).weightKg
  const capacity = capacityCheck(totals.weightKg + loadKg, profile.data?.capacityKg)
  const accepting = actions.acceptMany.isPending

  const toggle = (pickupId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(pickupId)) next.delete(pickupId)
      else next.add(pickupId)
      return next
    })
  }

  const accept = async () => {
    if (!selected.length || capacity.exceeds) return
    try {
      const outcome = await actions.acceptMany.mutateAsync(
        selected.map((pickup) => pickup.id),
      )
      const acceptedPoints = selected
        .filter((pickup) => outcome.accepted.includes(pickup.id))
        .reduce((sum, pickup) => sum + (pickup.summary?.rewardPoints ?? 0), 0)
      // Full success gets the celebration; partial outcomes need the toast text.
      if (outcome.taken.length || outcome.failed.length) {
        toast.show(acceptOutcomeMessage(outcome), acceptOutcomeTone(outcome))
      }
      if (outcome.accepted.length) {
        // Points are credited on collection and delivery, not on acceptance.
        setCelebration({
          id: Date.now(),
          points: 0,
          subtitle: `Rota pronta em Minhas entregas · até +${acceptedPoints} pts ao concluir`,
          title:
            outcome.accepted.length === 1
              ? '1 entrega aceita'
              : `${outcome.accepted.length} entregas aceitas`,
        })
      }
      setSelectedIds(new Set(outcome.failed.map((failure) => failure.id)))
      if (outcome.accepted.length && !outcome.failed.length) {
        setTab('mine')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      toast.show(
        error instanceof Error && error.message ? error.message : pickupMessages.assignError,
        'danger',
      )
    }
  }

  const confirmStep = async (input: {
    action: 'collect' | 'deliver'
    code: string
    location: GeoPoint
    pickupId: string
  }) => {
    const pickup = groups.active.find((item) => item.id === input.pickupId)
    const result = await actions.confirm.mutateAsync(input)
    // Same shared rule the API uses when crediting each step.
    setCelebration(
      input.action === 'collect'
        ? {
            id: Date.now(),
            points: COLLECTION_REWARD_POINTS,
            subtitle: 'Siga para a ONG com os alimentos',
            title: 'Retirada confirmada',
          }
        : {
            id: Date.now(),
            points: calculateRewardPoints(pickup?.summary?.estimatedWeightKg ?? 0),
            subtitle: 'Alimento resgatado. Obrigado!',
            title: 'Entrega concluída',
          },
    )
    return result
  }

  return (
    <div
      className={
        tab === 'available' && selected.length
          ? 'driver-deliveries driver-deliveries--with-bar'
          : 'driver-deliveries'
      }
    >
      <DriverAvailability />

      <div
        aria-label="Entregas do motorista"
        className="driver-tabs"
        data-active={tab}
        role="tablist"
      >
        <span className="driver-tabs__indicator" aria-hidden="true" />
        <button
          aria-controls="driver-panel-available"
          aria-selected={tab === 'available'}
          className="driver-tab"
          id="driver-tab-available"
          onClick={() => setTab('available')}
          role="tab"
          type="button"
        >
          <AppIcon name="package" size={18} />
          Disponíveis
          {pickups.data ? (
            <span className="driver-tab__count" key={groups.available.length}>
              {groups.available.length}
            </span>
          ) : null}
        </button>
        <button
          aria-controls="driver-panel-mine"
          aria-selected={tab === 'mine'}
          className="driver-tab"
          id="driver-tab-mine"
          onClick={() => setTab('mine')}
          role="tab"
          type="button"
        >
          <AppIcon name="truck" size={18} />
          Minhas entregas
          {pickups.data ? (
            <span className="driver-tab__count" key={groups.active.length}>
              {groups.active.length}
            </span>
          ) : null}
        </button>
      </div>

      {pickups.isPending ? (
        <div className="driver-available-grid" aria-busy="true" aria-label="Carregando entregas">
          <AvailablePickupSkeleton />
          <AvailablePickupSkeleton />
          <AvailablePickupSkeleton />
        </div>
      ) : pickups.isError && !pickups.data ? (
        <EmptyState
          action={<Button icon="refresh" onClick={() => void pickups.refetch()}>Tentar novamente</Button>}
          description={pickupMessages.loadError}
          icon="warning"
          title="Falha ao carregar as entregas"
        />
      ) : tab === 'available' ? (
        <section
          aria-labelledby="driver-tab-available"
          className="driver-panel grid gap-4"
          id="driver-panel-available"
          key="available"
          role="tabpanel"
        >
          {available.length ? (
            <>
              <div className="driver-toolbar">
                <p>
                  <span className="live-dot" aria-hidden="true" />
                  Selecione uma ou mais entregas
                  {profile.data?.capacityKg ? (
                    <>
                      {' · '}
                      <AppIcon name="truck" size={16} />
                      <MetricValue value={formatKg(profile.data.capacityKg)} />
                    </>
                  ) : null}
                </p>
                <fieldset className="driver-sort">
                  <legend className="sr-only">Ordenar entregas</legend>
                  <Button
                    aria-pressed={sort === 'urgency'}
                    icon="clock"
                    onClick={() => withViewTransition(() => setSort('urgency'))}
                  >
                    Mais urgentes
                  </Button>
                  <Button
                    aria-pressed={sort === 'nearest'}
                    icon="navigation"
                    onClick={() => withViewTransition(() => setSort('nearest'))}
                  >
                    Mais perto
                  </Button>
                </fieldset>
              </div>
              <div className="driver-available-grid">
                {available.map((pickup, index) => (
                  <AvailablePickupCard
                    disabled={accepting}
                    index={index}
                    key={pickup.id}
                    now={now}
                    onToggle={toggle}
                    pickup={pickup}
                    selected={selectedIds.has(pickup.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="driver-empty">
              <LottiePlayer animationData={routeAnimation} className="driver-empty__lottie" loop />
              <h2>Nenhuma entrega disponível agora</h2>
              <p>{pickupMessages.emptyAvailable}</p>
              <span className="driver-empty__live">
                <span className="live-dot" aria-hidden="true" />
                Procurando novas entregas
              </span>
            </div>
          )}
        </section>
      ) : (
        <section
          aria-labelledby="driver-tab-mine"
          className="driver-panel grid gap-4"
          id="driver-panel-mine"
          key="mine"
          role="tabpanel"
        >
          {groups.active.length ? (
            groups.active.map((pickup, index) => (
              <div
                className="driver-mine-item"
                key={pickup.id}
                style={{ '--stagger': Math.min(index, 8) } as CSSProperties}
              >
                <PickupCard
                  assigning={false}
                  audience="driver"
                  confirming={actions.confirm.isPending && actions.confirm.variables?.pickupId === pickup.id}
                  onAssign={actions.assign.mutateAsync}
                  onConfirm={confirmStep}
                  now={now}
                  pickup={pickup}
                />
              </div>
            ))
          ) : (
            <EmptyState
              action={<Button icon="package" onClick={() => setTab('available')}>Ver disponíveis</Button>}
              description={pickupMessages.emptyMine}
              icon="truck"
              title="Nenhuma entrega em andamento"
            />
          )}
          <CompletedPickups pickups={groups.completed} />
        </section>
      )}

      {tab === 'available' && selected.length ? (
        <SelectionBar
          busy={accepting}
          capacityKg={profile.data?.capacityKg}
          capacityMessage={capacity.message}
          onAccept={() => void accept()}
          onClear={() => setSelectedIds(new Set())}
          summary={selectionSummaryLabel(totals)}
          totals={totals}
        />
      ) : null}

      <SuccessBurst celebration={celebration} onDone={clearCelebration} />
    </div>
  )
}

function CompletedPickups({ pickups }: { pickups: readonly Pickup[] }) {
  if (!pickups.length) return null
  return (
    <details className="driver-completed">
      <summary>
        <AppIcon name="check" size={18} />
        Concluídas ({pickups.length})
      </summary>
      <ul>
        {pickups.map((pickup) => (
          <li key={pickup.id}>
            <span>
              {pickup.summary ? displayName(pickup.summary.ngoName) : `Doação ${pickup.donationId.slice(0, 8)}`}
            </span>
            <span className="metric-value">
              {pickup.summary ? formatKg(pickup.summary.estimatedWeightKg) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
