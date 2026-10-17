import { driverRoutePlanSchema, type Pickup } from '@resgata/shared'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '../../../shared/api'
import { RouteMap, type RouteMapStop } from '../../../shared/maps'
import { AppIcon, Card, LoadingState, MetricValue, StatusBadge } from '../../../shared/ui'
import { pickupMessages } from '../messages'
import { loadTrip } from '../model/trip'
import { pickupQueryKeys } from '../queryKeys'

const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Optimized order for the driver's active deliveries, with map and ETAs. */
export function RoutePlanCard({ active }: { active: readonly Pickup[] }) {
  const api = useApiClient()
  // Re-plan whenever a delivery is added, collected, or finished.
  const trip = loadTrip()
  const end = trip ? `${trip.destination.latitude},${trip.destination.longitude}` : ''
  const signature = `${active.map((pickup) => `${pickup.id}:${pickup.status}`).join('|')}>${end}`
  const plan = useQuery({
    queryKey: pickupQueryKeys.routePlan(signature),
    queryFn: async () =>
      driverRoutePlanSchema.parse(
        await api.get(`/drivers/me/route-plan${end ? `?end=${end}` : ''}`),
      ),
    enabled: active.length > 0,
    staleTime: 60_000,
  })

  if (!active.length) return null
  if (plan.isPending) return <LoadingState label={pickupMessages.routePlanLoading} />
  if (plan.isError || !plan.data.stops.length) return null

  const data = plan.data
  const generatedAt = Date.parse(data.generatedAt)
  const stops: RouteMapStop[] = [
    { label: '•', point: data.start, title: pickupMessages.routePlanYou, tone: 'start' },
    ...data.stops.map((stop) => ({
      label: String(stop.order),
      point: stop.point,
      title: `${stop.order}. ${stop.name}`,
      tone: stop.kind,
    })),
    ...(data.end
      ? [{ label: 'B', point: data.end, title: trip?.destinationLabel ?? 'Destino', tone: 'start' as const }]
      : []),
  ]

  return (
    <Card className="route-plan">
      <div className="route-plan__header">
        <div>
          <span className="eyebrow">{pickupMessages.routePlanEyebrow}</span>
          <h2 className="route-plan__title">
            {data.stops.length} {data.stops.length === 1 ? 'parada' : 'paradas'} ·{' '}
            <MetricValue value={`${data.drivingMinutes} min`} />
            {data.distanceKm !== null ? (
              <>
                {' · '}
                <MetricValue value={`${decimal.format(data.distanceKm)} km`} />
              </>
            ) : null}
          </h2>
        </div>
        {data.savedMinutes > 0 ? (
          <StatusBadge
            icon="route"
            label={`${pickupMessages.routePlanSaves} ${data.savedMinutes} min`}
            tone="success"
          />
        ) : null}
      </div>

      <div className="route-plan__map">
        <RouteMap path={data.path} stops={stops} />
      </div>

      <ol className="route-plan__stops">
        {data.stops.map((stop) => {
          const eta = new Date(generatedAt + stop.etaMinutes * 60_000)
          return (
            <li className={`route-plan__stop route-plan__stop--${stop.kind}`} key={`${stop.pickupId}-${stop.kind}`}>
              <span className="route-plan__order">{stop.order}</span>
              <div className="route-plan__stop-body">
                <span className="route-plan__kind">
                  <AppIcon name={stop.kind === 'pickup' ? 'package' : 'flag'} size={14} />
                  {stop.kind === 'pickup' ? pickupMessages.routePlanPickup : pickupMessages.routePlanDelivery}
                </span>
                <strong>{stop.name}</strong>
                <small>{stop.address}</small>
              </div>
              <div className="route-plan__eta">
                <strong className="metric-value">{clock.format(eta)}</strong>
                {stop.lateMinutes > 0 ? (
                  <StatusBadge icon="warning" label={`+${stop.lateMinutes} min`} tone="danger" />
                ) : stop.deadline ? (
                  <small>até {clock.format(new Date(stop.deadline))}</small>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="route-plan__note">
        {data.savedMinutes > 0
          ? `${pickupMessages.routePlanVersus} ${data.baselineMinutes} min.`
          : pickupMessages.routePlanAlreadyBest}{' '}
        {data.travelTimes === 'azure-maps'
          ? pickupMessages.routePlanAzure
          : pickupMessages.routePlanEstimate}
      </p>
    </Card>
  )
}
