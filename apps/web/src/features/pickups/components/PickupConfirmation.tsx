import type { GeoPoint, Pickup } from '@resgata/shared'
import { useCallback, useState } from 'react'
import { Button } from '../../../shared/ui'
import { pickupErrorMessage, pickupMessages } from '../messages'
import {
  coordinateLabel,
  mapPickupConfirmation,
  normalizeConfirmationCode,
} from '../viewModels'
import { QrCodeReader } from './QrCodeReader'

interface PickupConfirmationProps {
  action: 'collect' | 'deliver'
  busy: boolean
  onCancel(): void
  onConfirm(input: {
    action: 'collect' | 'deliver'
    code: string
    location: GeoPoint
    pickupId: string
  }): Promise<unknown>
  pickup: Pickup
}

export function PickupConfirmation({
  action,
  busy,
  onCancel,
  onConfirm,
  pickup,
}: PickupConfirmationProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null)
  const label = action === 'collect' ? 'retirada' : 'entrega'

  const readCode = useCallback((value: string) => {
    setCode(normalizeConfirmationCode(value))
  }, [])

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationMessage('GPS indisponível. Será usado o ponto cadastrado.')
      return
    }
    setLocationMessage('Obtendo localização…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }
        setCurrentLocation(location)
        setLocationMessage(`Localização capturada: ${coordinateLabel(location)}`)
      },
      () => {
        setCurrentLocation(null)
        setLocationMessage('GPS não autorizado. Será usado o ponto cadastrado.')
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8_000 },
    )
  }

  const submit = async () => {
    setError(null)
    const request = mapPickupConfirmation({
      action,
      code,
      currentLocation,
      pickup,
    })
    if (request.code.length !== 6) {
      setError('Digite ou leia um código de seis números.')
      return
    }
    try {
      await onConfirm({ ...request, action, pickupId: pickup.id })
      onCancel()
    } catch (caught) {
      setError(
        pickupErrorMessage(
          caught,
          action === 'collect'
            ? pickupMessages.collectError
            : pickupMessages.deliverError,
        ),
      )
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] p-4">
      <div>
        <span className="eyebrow">Confirmação segura</span>
        <h3 className="mb-1 text-lg">Confirmar {label}</h3>
        <p className="mb-0 text-sm">Leia o QR ou use o código manual informado no local.</p>
      </div>
      <QrCodeReader onCode={readCode} />
      <label className="grid gap-1 font-bold" htmlFor={`pickup-code-${pickup.id}-${action}`}>
        Código manual
        <input
          autoComplete="one-time-code"
          className="min-h-12 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 text-center font-mono text-2xl font-medium tabular-nums tracking-[0.35em]"
          id={`pickup-code-${pickup.id}-${action}`}
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(normalizeConfirmationCode(event.target.value))}
          pattern="[0-9]{6}"
          placeholder="000000"
          value={code}
        />
      </label>
      <Button icon="route" onClick={locate}>Usar localização do navegador</Button>
      {locationMessage ? <output className="mb-0 block text-sm">{locationMessage}</output> : null}
      <p className="mb-0 text-xs">
        Fallback: se o GPS falhar, o ponto cadastrado da {label} será enviado.
      </p>
      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Button disabled={busy} onClick={onCancel} variant="ghost">Cancelar</Button>
        <Button disabled={busy} icon="check" onClick={() => void submit()} variant="primary">
          Confirmar {label}
        </Button>
      </div>
    </div>
  )
}
