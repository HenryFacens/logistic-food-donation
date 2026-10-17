import type {
  Address,
  DonationUnit,
  GeoPoint,
  Pickup,
  PickupItem,
  PickupStatus,
} from '@resgata/shared'

export const pickupStatusLabels: Record<PickupStatus, string> = {
  assigned: 'Motorista atribuído',
  awaiting_driver: 'Aguardando motorista',
  cancelled: 'Cancelada',
  collected: 'Retirada confirmada',
  delivered: 'Entrega concluída',
  en_route_delivery: 'Em rota para a ONG',
  en_route_pickup: 'Em rota para retirada',
}

export type PickupAction = 'assign' | 'collect' | 'deliver' | null

export const nextPickupAction = (
  pickup: Pick<Pickup, 'driverId' | 'status'>,
): PickupAction => {
  if (pickup.status === 'awaiting_driver' && !pickup.driverId) return 'assign'
  if (pickup.status === 'assigned' || pickup.status === 'en_route_pickup') {
    return 'collect'
  }
  if (pickup.status === 'collected' || pickup.status === 'en_route_delivery') {
    return 'deliver'
  }
  return null
}

export const confirmationTarget = (
  pickup: Pick<Pickup, 'deliveryLocation' | 'pickupLocation'>,
  action: 'collect' | 'deliver',
) => action === 'collect' ? pickup.pickupLocation : pickup.deliveryLocation

export const normalizeConfirmationCode = (value: string) =>
  value.replace(/\D/g, '').slice(0, 6)

export const mapPickupConfirmation = ({
  action,
  code,
  currentLocation,
  pickup,
}: {
  action: 'collect' | 'deliver'
  code: string
  currentLocation?: GeoPoint | null
  pickup: Pick<Pickup, 'deliveryLocation' | 'pickupLocation'>
}) => ({
  code: normalizeConfirmationCode(code),
  location: currentLocation || confirmationTarget(pickup, action),
})

export const coordinateLabel = (point: GeoPoint) =>
  `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`

// Driver deliveries: tab split, urgency, sorting, selection, and capacity.

export type DriverTab = 'available' | 'mine'
export type AvailableSort = 'nearest' | 'urgency'
export type UrgencyTone = 'danger' | 'warning'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

export const ACTIVE_DRIVER_STATUSES: readonly PickupStatus[] = [
  'assigned',
  'en_route_pickup',
  'collected',
  'en_route_delivery',
]

export const splitDriverPickups = (
  pickups: readonly Pickup[],
  driverId: string | null | undefined,
) => {
  const available: Pickup[] = []
  const active: Pickup[] = []
  const completed: Pickup[] = []
  for (const pickup of pickups) {
    if (pickup.status === 'awaiting_driver' && !pickup.driverId) {
      available.push(pickup)
    } else if (driverId && pickup.driverId !== driverId) {
      continue
    } else if (ACTIVE_DRIVER_STATUSES.includes(pickup.status)) {
      active.push(pickup)
    } else if (pickup.status === 'delivered') {
      completed.push(pickup)
    }
  }
  return { active, available, completed }
}

/** "45 min", "1h20", "3h". */
export const formatRemaining = (milliseconds: number) => {
  const minutes = Math.max(1, Math.ceil(milliseconds / MINUTE_MS))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`
}

export const pickupUrgency = (
  expiresAt: string | undefined,
  now: number,
): { label: string; tone: UrgencyTone | null } | null => {
  if (!expiresAt) return null
  const remaining = Date.parse(expiresAt) - now
  if (Number.isNaN(remaining)) return null
  if (remaining <= 0) return { label: 'Vencida', tone: 'danger' }
  const label = `Vence em ${formatRemaining(remaining)}`
  if (remaining < HOUR_MS) return { label, tone: 'danger' }
  if (remaining < 2 * HOUR_MS) return { label, tone: 'warning' }
  return { label, tone: null }
}

const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Delivery deadline at the NGO: "Entregar até 15:40", toned by time left. */
export const deliveryDeadline = (
  deliverBy: string | undefined,
  now: number,
): { label: string; tone: UrgencyTone | null } | null => {
  if (!deliverBy) return null
  const deadline = Date.parse(deliverBy)
  if (Number.isNaN(deadline)) return null
  const remaining = deadline - now
  if (remaining <= 0) return { label: 'Prazo de entrega vencido', tone: 'danger' }
  const label = `Entregar até ${clock.format(deadline)}`
  if (remaining < HOUR_MS) return { label, tone: 'danger' }
  if (remaining < 2 * HOUR_MS) return { label, tone: 'warning' }
  return { label, tone: null }
}

const unitLabels: Record<DonationUnit, [singular: string, plural: string]> = {
  box: ['caixa', 'caixas'],
  kg: ['kg', 'kg'],
  tray: ['bandeja', 'bandejas'],
  unit: ['un.', 'un.'],
}

/** "12 kg", "1 caixa", "4 bandejas". */
export const formatQuantity = (quantity: number, unit: DonationUnit) =>
  `${decimal.format(quantity)} ${unitLabels[unit][quantity === 1 ? 0 : 1]}`

export const formatItem = (item: PickupItem) =>
  `${item.name} – ${formatQuantity(item.quantity, item.unit)}`

const expiryOf = (pickup: Pickup) =>
  pickup.summary ? Date.parse(pickup.summary.expiresAt) : Number.POSITIVE_INFINITY

const distanceOf = (pickup: Pickup) =>
  pickup.summary?.distanceToPickupKm ?? Number.POSITIVE_INFINITY

/** Urgency: soonest expiry first. Nearest: closest pickup point first. */
export const sortAvailablePickups = (
  pickups: readonly Pickup[],
  sort: AvailableSort,
) => {
  const primary = sort === 'urgency' ? expiryOf : distanceOf
  const secondary = sort === 'urgency' ? distanceOf : expiryOf
  return [...pickups].sort(
    (left, right) =>
      primary(left) - primary(right) ||
      secondary(left) - secondary(right) ||
      left.id.localeCompare(right.id),
  )
}

export interface SelectionTotals {
  count: number
  points: number
  weightKg: number
}

export const selectionTotals = (pickups: readonly Pickup[]): SelectionTotals =>
  pickups.reduce<SelectionTotals>(
    (totals, pickup) => ({
      count: totals.count + 1,
      points: totals.points + (pickup.summary?.rewardPoints ?? 0),
      weightKg: totals.weightKg + (pickup.summary?.estimatedWeightKg ?? 0),
    }),
    { count: 0, points: 0, weightKg: 0 },
  )

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const formatKg = (value: number) => `${decimal.format(value)} kg`
export const formatKm = (value: number) => `${decimal.format(value)} km`

export const capacityCheck = (
  weightKg: number,
  capacityKg: number | undefined,
): { exceeds: boolean; message: string | null } => {
  if (!capacityKg || weightKg <= capacityKg) return { exceeds: false, message: null }
  return {
    exceeds: true,
    message: `Excede a capacidade do veículo (${formatKg(capacityKg)})`,
  }
}

/** "3 entregas · 42 kg · +225 pts". */
export const selectionSummaryLabel = ({ count, points, weightKg }: SelectionTotals) =>
  `${count} ${count === 1 ? 'entrega' : 'entregas'} · ${formatKg(weightKg)} · +${points} pts`

export interface AcceptOutcome {
  accepted: string[]
  failed: Array<{ id: string; message: string }>
  taken: string[]
}

/** "2 aceitas · 1 já foi pega por outro motorista". */
export const acceptOutcomeMessage = ({ accepted, failed, taken }: AcceptOutcome) => {
  const parts: string[] = []
  if (accepted.length) {
    parts.push(`${accepted.length} ${accepted.length === 1 ? 'aceita' : 'aceitas'}`)
  }
  if (taken.length) {
    parts.push(
      taken.length === 1
        ? '1 já foi pega por outro motorista'
        : `${taken.length} já foram pegas por outros motoristas`,
    )
  }
  if (failed.length) {
    parts.push(`${failed.length} com falha, tente de novo`)
  }
  return parts.join(' · ')
}

export const acceptOutcomeTone = ({ accepted, failed, taken }: AcceptOutcome) => {
  if (!failed.length && !taken.length) return 'success' as const
  return accepted.length ? ('info' as const) : ('danger' as const)
}

export const pickupCategoryLabels: Record<string, string> = {
  bakery: 'Padaria',
  dairy: 'Laticínios',
  other: 'Outros',
  pantry: 'Mercearia',
  prepared: 'Refeição pronta',
  produce: 'Hortifruti',
}

/** The driver view hides the SIMULADO label, so names drop the suffix. */
export const displayName = (name: string) => name.replace(/\s+SIMULADO$/u, '')

/** "SIMULADO - frutas e verduras" -> "Frutas e verduras". */
export const displayDescription = (description: string) => {
  const text = description.replace(/^SIMULADO\s*[-–]\s*/u, '')
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1)
}

export const shortAddress = (address: Pick<Address, 'district' | 'line1'>) =>
  `${address.district} · ${address.line1}`
