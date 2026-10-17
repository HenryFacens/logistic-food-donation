import type { Pickup } from '@resgata/shared'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  EmptyState,
  MetricValue,
  SimuladoBadge,
  useToast,
} from '../../../shared/ui'
import {
  useCurrentProfile,
  usePickupActions,
  usePickups,
} from '../api/usePickups'
import {
  AvailablePickupCard,
  AvailablePickupSkeleton,
} from '../components/AvailablePickupCard'
import { PickupCard } from '../components/PickupCard'
import { SelectionBar } from '../components/SelectionBar'
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

export function DriverDeliveriesPage() {
  const [tab, setTab] = useState<DriverTab>('available')
  const [sort, setSort] = useState<AvailableSort>('urgency')
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const pickups = usePickups('driver', {
    refetchInterval: tab === 'available' ? AVAILABLE_REFETCH_MS : false,
  })
  const profile = useCurrentProfile()
  const actions = usePickupActions()
  const toast = useToast()
  const now = useNow(30_000)

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
  const capacity = capacityCheck(totals.weightKg, profile.data?.capacityKg)
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
      toast.show(acceptOutcomeMessage(outcome), acceptOutcomeTone(outcome))
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

  return (
    <div
      className={
        tab === 'available' && selected.length
          ? 'driver-deliveries driver-deliveries--with-bar'
          : 'driver-deliveries'
      }
    >
      <div className="driver-tabs" role="tablist" aria-label="Entregas do motorista">
        <button
          aria-controls="driver-panel-available"
          aria-selected={tab === 'available'}
          className="driver-tab"
          id="driver-tab-available"
          onClick={() => setTab('available')}
          role="tab"
          type="button"
        >
          Disponíveis
          {pickups.data ? <span className="driver-tab__count">{groups.available.length}</span> : null}
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
          Minhas entregas
          {pickups.data ? <span className="driver-tab__count">{groups.active.length}</span> : null}
        </button>
      </div>

      {pickups.isPending ? (
        <div className="driver-available-grid" aria-busy="true" aria-label="Carregando entregas">
          <AvailablePickupSkeleton />
          <AvailablePickupSkeleton />
          <AvailablePickupSkeleton />
        </div>
      ) : pickups.isError ? (
        <EmptyState
          action={<Button icon="refresh" onClick={() => void pickups.refetch()}>Tentar novamente</Button>}
          description={pickupMessages.loadError}
          icon="warning"
          title="Falha ao carregar as entregas"
        />
      ) : tab === 'available' ? (
        <section
          aria-labelledby="driver-tab-available"
          className="grid gap-4"
          id="driver-panel-available"
          role="tabpanel"
        >
          {available.length ? (
            <>
              <div className="driver-toolbar">
                <p>
                  Selecione uma ou mais entregas
                  {profile.data?.capacityKg ? (
                    <>
                      {' · capacidade '}
                      <MetricValue value={formatKg(profile.data.capacityKg)} />
                    </>
                  ) : null}
                </p>
                <fieldset className="driver-sort">
                  <legend className="sr-only">Ordenar entregas</legend>
                  <Button aria-pressed={sort === 'urgency'} onClick={() => setSort('urgency')}>
                    Mais urgentes
                  </Button>
                  <Button aria-pressed={sort === 'nearest'} onClick={() => setSort('nearest')}>
                    Mais perto
                  </Button>
                </fieldset>
              </div>
              <div className="driver-available-grid">
                {available.map((pickup) => (
                  <AvailablePickupCard
                    disabled={accepting}
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
            <EmptyState
              description={pickupMessages.emptyAvailable}
              icon="route"
              title="Nenhuma entrega disponível agora"
            />
          )}
        </section>
      ) : (
        <section
          aria-labelledby="driver-tab-mine"
          className="grid gap-4"
          id="driver-panel-mine"
          role="tabpanel"
        >
          {groups.active.length ? (
            groups.active.map((pickup) => (
              <PickupCard
                assigning={false}
                audience="driver"
                confirming={actions.confirm.isPending && actions.confirm.variables?.pickupId === pickup.id}
                key={pickup.id}
                onAssign={actions.assign.mutateAsync}
                onConfirm={actions.confirm.mutateAsync}
                pickup={pickup}
              />
            ))
          ) : (
            <EmptyState
              action={<Button icon="route" onClick={() => setTab('available')}>Ver disponíveis</Button>}
              description={pickupMessages.emptyMine}
              icon="route"
              title="Nenhuma entrega em andamento"
            />
          )}
          <CompletedPickups pickups={groups.completed} />
        </section>
      )}

      {tab === 'available' && selected.length ? (
        <SelectionBar
          busy={accepting}
          capacityMessage={capacity.message}
          onAccept={() => void accept()}
          onClear={() => setSelectedIds(new Set())}
          summary={selectionSummaryLabel(totals)}
        />
      ) : null}
    </div>
  )
}

function CompletedPickups({ pickups }: { pickups: readonly Pickup[] }) {
  if (!pickups.length) return null
  return (
    <details className="driver-completed">
      <summary>
        Concluídas ({pickups.length})
        <span className="ml-auto"><SimuladoBadge /></span>
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
