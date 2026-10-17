import { driverStatusSchema, type GeoPoint } from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useApiClient } from '../../../shared/api'
import { Button, Card } from '../../../shared/ui'
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
    <Card className={`driver-availability${available ? ' is-online' : ''}`}>
      <div className="driver-availability__row">
        <span className="driver-availability__dot" aria-hidden="true" />
        <div className="driver-availability__copy">
          <strong>{available ? pickupMessages.online : pickupMessages.offline}</strong>
          <span>
            {pickupMessages.capacity} {status.data.capacityKg} kg
          </span>
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
      </div>
      {available ? (
        <button
          className="driver-availability__location"
          disabled={update.isPending}
          onClick={() => update.mutate(true)}
          type="button"
        >
          {pickupMessages.refreshLocation}
        </button>
      ) : null}
      {locationNote ? <output className="block text-sm">{locationNote}</output> : null}
    </Card>
  )
}
