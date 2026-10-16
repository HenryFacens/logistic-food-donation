import type {
  GeoPoint,
  Pickup,
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
