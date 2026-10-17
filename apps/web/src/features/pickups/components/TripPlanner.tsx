import {
  tripMatchSchema,
  type GeoPoint,
  type TripCandidate,
  type TripMatch,
} from '@resgata/shared'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useApiClient } from '../../../shared/api'
import {
  AddressAutocomplete,
  RouteMap,
  readBrowserLocation,
  type RouteMapStop,
} from '../../../shared/maps'
import { AppIcon, Button, LoadingState } from '../../../shared/ui'
import { clearTrip, saveTrip } from '../model/trip'
import { displayName, formatKg } from '../viewModels'

interface Place {
  label: string
  point: GeoPoint | null
}

// A real commute in Campinas that passes several demo pickups.
const EXAMPLE = {
  origin: { label: 'Rua Coronel Quirino, 900 · Cambuí', point: { latitude: -22.8974, longitude: -47.051 } },
  destination: {
    label: 'Unicamp · Cidade Universitária, Barão Geraldo',
    point: { latitude: -22.8172, longitude: -47.0698 },
  },
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Next quarter hour, as "HH:MM", for the departure default. */
const nextQuarter = () => {
  const date = new Date(Date.now() + 15 * 60_000)
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0)
  return date.toTimeString().slice(0, 5)
}

/** Today at "HH:MM", or tomorrow when that time has passed. */
const departureIso = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  if (date.getTime() < Date.now() - 5 * 60_000) date.setDate(date.getDate() + 1)
  return date.toISOString()
}

function PlaceField({
  id,
  label,
  onChange,
  place,
  extra,
}: {
  id: string
  label: string
  onChange(place: Place): void
  place: Place
  extra?: React.ReactNode
}) {
  return (
    <div className="trip-field">
      <label htmlFor={id}>{label}</label>
      <AddressAutocomplete
        id={id}
        onChange={(text) => onChange({ label: text, point: null })}
        onPlace={(found) =>
          onChange({
            label: [found.line1, found.district].filter(Boolean).join(' · '),
            point: found.location,
          })
        }
        value={place.label}
      />
      {extra}
    </div>
  )
}

function CandidateRow({
  candidate,
  checked,
  disabled,
  onToggle,
}: {
  candidate: TripCandidate
  checked: boolean
  disabled: boolean
  onToggle(): void
}) {
  return (
    <li className={`trip-candidate${checked ? ' is-selected' : ''}`}>
      <label
        aria-label={`${displayName(candidate.sellerName)} para ${displayName(candidate.ngoName)}, ${
          candidate.onTime ? `${Math.max(0, candidate.detourMinutes)} minutos a mais` : 'não dá tempo'
        }`}
      >
        <input
          checked={checked}
          disabled={disabled || !candidate.onTime}
          onChange={onToggle}
          type="checkbox"
        />
        <span className="trip-candidate__body">
          <strong>
            {displayName(candidate.sellerName)} → {displayName(candidate.ngoName)}
          </strong>
          <span>
            {candidate.description} · {formatKg(candidate.weightKg)} · retirar até{' '}
            {clock(candidate.pickupDeadline)}
          </span>
        </span>
        <span className="trip-candidate__numbers">
          <strong className={candidate.onTheWay ? 'is-good' : ''}>
            {candidate.onTime
              ? `+${Math.max(0, candidate.detourMinutes)} min`
              : 'Não dá tempo'}
          </strong>
          <small>+{candidate.rewardPoints} pts</small>
        </span>
      </label>
    </li>
  )
}

interface TripPlannerProps {
  accepting: boolean
  onAccept(pickupIds: string[]): Promise<boolean>
}

/**
 * "BlaBlaCar" mode: the driver says where they are already going and when;
 * we find deliveries on the way and show the combined route.
 */
export function TripPlanner({ accepting, onAccept }: TripPlannerProps) {
  const api = useApiClient()
  const [origin, setOrigin] = useState<Place>({ label: '', point: null })
  const [destination, setDestination] = useState<Place>({ label: '', point: null })
  const [time, setTime] = useState(nextQuarter)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[] | null>(null)
  const [showOthers, setShowOthers] = useState(false)

  const match = useMutation({
    mutationFn: async (pickupIds?: string[]) =>
      tripMatchSchema.parse(
        await api.post('/drivers/me/trip-match', {
          origin: origin.point,
          destination: destination.point,
          departAt: departureIso(time),
          ...(pickupIds ? { pickupIds } : {}),
        }),
      ),
    onSuccess: (data) => setSelected(data.plan.pickupIds),
    onError: () => setError('Não foi possível calcular o trajeto. Tente de novo.'),
  })

  const search = () => {
    setError(null)
    if (!origin.point || !destination.point) {
      setError('Escolha a saída e o destino na lista de endereços.')
      return
    }
    match.mutate(undefined)
  }

  const useMyLocation = async () => {
    setLocating(true)
    try {
      const point = await readBrowserLocation()
      setOrigin({ label: 'Minha localização', point })
    } catch {
      setError('Não conseguimos ler o GPS. Digite o endereço de saída.')
    } finally {
      setLocating(false)
    }
  }

  const toggle = (pickupId: string) => {
    const current = selected ?? []
    const next = current.includes(pickupId)
      ? current.filter((id) => id !== pickupId)
      : [...current, pickupId]
    setSelected(next)
    match.mutate(next)
  }

  const accept = async (data: TripMatch) => {
    if (!origin.point || !destination.point) return
    // The route under "Minhas" starts where the trip starts.
    await api
      .post('/drivers/me', { available: true, location: origin.point })
      .catch(() => undefined)
    // Saved first so the route under "Minhas" already ends at the destination.
    saveTrip({
      origin: origin.point,
      destination: destination.point,
      destinationLabel: destination.label,
      departAt: data.departAt,
    })
    const ok = await onAccept(data.plan.pickupIds)
    if (!ok) clearTrip()
  }

  const data = match.data
  const onTheWay = data?.candidates.filter((candidate) => candidate.onTheWay) ?? []
  const others = data?.candidates.filter((candidate) => !candidate.onTheWay) ?? []
  const stops: RouteMapStop[] =
    data?.plan.stops.map((stop, index) => ({
      label:
        stop.kind === 'origin' ? 'A' : stop.kind === 'destination' ? 'B' : String(index),
      point: stop.point,
      title: stop.name,
      tone: stop.kind === 'origin' || stop.kind === 'destination' ? 'start' : stop.kind,
    })) ?? []

  return (
    <div className="trip-planner">
      <section className="screen-card trip-form">
        <div>
          <h2>Vai dirigir hoje?</h2>
          <p>
            Diga de onde sai, para onde vai e a que horas. Mostramos as entregas que ficam no
            seu caminho, como uma carona.
          </p>
        </div>
        <PlaceField
          extra={
            <button
              className="trip-link"
              disabled={locating}
              onClick={() => void useMyLocation()}
              type="button"
            >
              <AppIcon name="navigation" size={16} />
              {locating ? 'Buscando…' : 'Usar minha localização'}
            </button>
          }
          id="trip-origin"
          label="Saindo de"
          onChange={setOrigin}
          place={origin}
        />
        <PlaceField
          id="trip-destination"
          label="Indo para"
          onChange={setDestination}
          place={destination}
        />
        <label className="trip-field trip-field--time" htmlFor="trip-time">
          Saída às
          <input
            id="trip-time"
            onChange={(event) => setTime(event.target.value)}
            type="time"
            value={time}
          />
        </label>
        {error ? (
          <p className="trip-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={match.isPending}
          icon="route"
          onClick={search}
          variant="primary"
        >
          {match.isPending && !data ? 'Procurando…' : 'Encontrar entregas no caminho'}
        </Button>
        <button
          className="trip-link"
          onClick={() => {
            setOrigin(EXAMPLE.origin)
            setDestination(EXAMPLE.destination)
            setError(null)
          }}
          type="button"
        >
          Usar exemplo: Cambuí → Unicamp
        </button>
      </section>

      {match.isPending && !data ? <LoadingState label="Calculando rotas com o trânsito" /> : null}

      {data ? (
        <section className="screen-card trip-result" aria-busy={match.isPending}>
          <div className="trip-summary">
            <div>
              <span>Só o seu trajeto</span>
              <strong>{data.direct.minutes} min</strong>
            </div>
            <div>
              <span>
                Com {data.plan.pickupIds.length}{' '}
                {data.plan.pickupIds.length === 1 ? 'entrega' : 'entregas'}
              </span>
              <strong>
                {data.plan.minutes} min{' '}
                <small>(+{Math.max(0, data.plan.detourMinutes)} min)</small>
              </strong>
            </div>
            <div>
              <span>Você ganha</span>
              <strong className="is-good">+{data.plan.rewardPoints} pts</strong>
            </div>
          </div>

          {stops.length ? (
            <RouteMap
              path={data.plan.path}
              secondaryPath={data.plan.pickupIds.length ? data.direct.path : null}
              stops={stops}
            />
          ) : null}
          <p className="trip-legend">
            <span className="trip-legend__line" /> rota com entregas
            <span className="trip-legend__line trip-legend__line--direct" /> seu trajeto direto
          </p>

          {data.plan.pickupIds.length ? (
            <ol className="trip-stops">
              {data.plan.stops.map((stop, index) => (
                <li key={`${stop.kind}-${stop.pickupId ?? index}`}>
                  <time>{clock(stop.arriveAt)}</time>
                  <span>
                    {stop.kind === 'origin'
                      ? `Saída · ${origin.label}`
                      : stop.kind === 'destination'
                        ? `Chegada · ${destination.label}`
                        : `${stop.kind === 'pickup' ? 'Retirar em' : 'Entregar em'} ${displayName(stop.name)}`}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="trip-empty">
              Nenhuma entrega cabe no seu caminho com até {data.maxDetourMinutes} min a mais. Veja
              as opções abaixo ou tente outro horário.
            </p>
          )}

          <div className="trip-candidates">
            <h3>No seu caminho</h3>
            {onTheWay.length ? (
              <ul>
                {onTheWay.map((candidate) => (
                  <CandidateRow
                    candidate={candidate}
                    checked={selected?.includes(candidate.pickupId) ?? false}
                    disabled={match.isPending}
                    key={candidate.pickupId}
                    onToggle={() => toggle(candidate.pickupId)}
                  />
                ))}
              </ul>
            ) : (
              <p>Nenhuma entrega com até {data.maxDetourMinutes} min de desvio.</p>
            )}
            {others.length ? (
              <>
                <button
                  className="trip-link"
                  onClick={() => setShowOthers((open) => !open)}
                  type="button"
                >
                  {showOthers ? 'Ocultar' : 'Ver'} {others.length} fora do caminho
                </button>
                {showOthers ? (
                  <ul>
                    {others.map((candidate) => (
                      <CandidateRow
                        candidate={candidate}
                        checked={selected?.includes(candidate.pickupId) ?? false}
                        disabled={match.isPending}
                        key={candidate.pickupId}
                        onToggle={() => toggle(candidate.pickupId)}
                      />
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>

          {data.plan.pickupIds.length ? (
            <Button
              disabled={accepting || match.isPending}
              icon="check"
              onClick={() => void accept(data)}
              variant="primary"
            >
              {accepting
                ? 'Aceitando…'
                : `Aceitar ${data.plan.pickupIds.length} ${
                    data.plan.pickupIds.length === 1 ? 'entrega' : 'entregas'
                  } no caminho`}
            </Button>
          ) : null}
          <p className="trip-footnote">
            {data.travelTimes === 'azure-maps'
              ? 'Tempos de carro do Azure Maps. A ordem das paradas é otimizada respeitando o prazo de cada doação.'
              : 'Tempos estimados pela distância. A ordem das paradas respeita o prazo de cada doação.'}
          </p>
        </section>
      ) : null}
    </div>
  )
}
