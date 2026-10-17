import type { DeliveryReceiptCondition, GeoPoint, Pickup, PickupStatus } from '@resgata/shared'

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

export const pickupProgress = (status: PickupStatus) => {
  const steps = [
    { key: 'assigned', label: 'Atribuída' },
    { key: 'pickup', label: 'Retirada' },
    { key: 'delivery', label: 'Entrega' },
  ] as const
  const completedCount = {
    assigned: 0,
    awaiting_driver: 0,
    cancelled: 0,
    collected: 2,
    delivered: 3,
    en_route_delivery: 2,
    en_route_pickup: 0,
  }[status]
  const hasCurrentStep =
    status !== 'awaiting_driver' &&
    status !== 'cancelled' &&
    status !== 'delivered'

  return steps.map((step, index) => ({
    ...step,
    complete: index < completedCount,
    current: hasCurrentStep && index === completedCount,
  }))
}

export const pickupShortId = (pickup: Pick<Pickup, 'donationId'>) =>
  pickup.donationId.slice(0, 8).toUpperCase()

const roundWeight = (value: number) => Math.round(value * 100) / 100

export const receiptWeightDefaults = (
  condition: DeliveryReceiptCondition,
  estimatedWeightKg: number,
) => {
  if (condition === 'all_good') {
    return {
      receivedWeightKg: roundWeight(estimatedWeightKg),
      rejectedWeightKg: 0,
    }
  }

  if (condition === 'rejected') {
    return {
      receivedWeightKg: 0,
      rejectedWeightKg: roundWeight(estimatedWeightKg),
    }
  }

  const rejectedWeightKg =
    estimatedWeightKg <= 0.1
      ? roundWeight(estimatedWeightKg / 2)
      : Math.min(
          roundWeight(Math.max(estimatedWeightKg * 0.1, 0.1)),
          roundWeight(estimatedWeightKg - 0.01),
        )

  return {
    receivedWeightKg: roundWeight(estimatedWeightKg - rejectedWeightKg),
    rejectedWeightKg: roundWeight(rejectedWeightKg),
  }
}

export const formatDashboardPeriod = (
  periodStart: string,
  periodEnd: string,
) => {
  const format = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return `${format.format(new Date(periodStart))} – ${format.format(
    new Date(periodEnd),
  )}`
}
