import { driverStatusSchema, type GeoPoint } from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useApiClient } from '../../../shared/api'
import { Button, Card, StatusBadge } from '../../../shared/ui'
import { pickupMessages } from '../messages'
import { pickupQueryKeys } from '../queryKeys'

const driverStatusKey = ['driver-status'] as const

const readPosition = () =>
  new Promise<GeoPoint | undefined>((resolve) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      resolve(undefined)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    )
  })

/** Lets drivers go online/offline and share where they are for nearby pickups. */
export function DriverAvailability() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [locationNote, setLocationNote] = useState<string | null>(null)
  const status = useQuery({
    queryKey: driverStatusKey,
    queryFn: async () => driverStatusSchema.parse(await apiClient.get('/drivers/me')),
  })
  const update = useMutation({
    mutationFn: async (available: boolean) => {
      const location = available ? await readPosition() : undefined
      setLocationNote(
        available
          ? location
            ? pickupMessages.locationShared
            : pickupMessages.locationNotShared
          : null,
      )
      return driverStatusSchema.parse(
        await apiClient.post('/drivers/me', { available, location }),
      )
    },
    onSuccess(data) {
      queryClient.setQueryData(driverStatusKey, data)
      void queryClient.invalidateQueries({ queryKey: pickupQueryKeys.all })
    },
  })

  if (!status.data) return null
  const available = status.data.available

  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="eyebrow">{pickupMessages.availabilityEyebrow}</span>
          <strong className="block text-lg">
            {available ? pickupMessages.online : pickupMessages.offline}
          </strong>
          <span className="text-sm">
            {pickupMessages.capacity} {status.data.capacityKg} kg
          </span>
        </div>
        <StatusBadge
          label={available ? pickupMessages.onlineBadge : pickupMessages.offlineBadge}
          tone={available ? 'success' : 'neutral'}
        />
      </div>
      <Button
        disabled={update.isPending}
        icon={available ? 'offline' : 'route'}
        onClick={() => update.mutate(!available)}
        variant={available ? 'secondary' : 'primary'}
      >
        {update.isPending
          ? pickupMessages.updating
          : available
            ? pickupMessages.goOffline
            : pickupMessages.goOnline}
      </Button>
      {available ? (
        <Button disabled={update.isPending} onClick={() => update.mutate(true)} variant="ghost">
          {pickupMessages.refreshLocation}
        </Button>
      ) : null}
      {locationNote ? <p className="mb-0 text-sm">{locationNote}</p> : null}
    </Card>
  )
}
