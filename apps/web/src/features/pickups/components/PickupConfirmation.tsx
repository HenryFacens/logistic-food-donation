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
  const codeDigits = Array.from({ length: 6 }, (_, index) => code[index] || '')

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
    <div className="pickup-confirmation">
      <div className="pickup-confirmation__heading">
        <span className="eyebrow">Confirmação segura</span>
        <h3>Confirmar {label}</h3>
        <p>Leia o QR ou use o código manual informado no local.</p>
      </div>
      <QrCodeReader onCode={readCode} />
      <label className="pickup-confirmation__code" htmlFor={`pickup-code-${pickup.id}-${action}`}>
        <span>Ou digite o código de 6 números</span>
        <span className="pickup-confirmation__digits" aria-hidden="true">
          {codeDigits.map((digit, index) => (
            <span className={digit ? 'is-filled' : ''} key={index}>{digit}</span>
          ))}
        </span>
        <input
          autoComplete="one-time-code"
          id={`pickup-code-${pickup.id}-${action}`}
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(normalizeConfirmationCode(event.target.value))}
          pattern="[0-9]{6}"
          placeholder="000000"
          value={code}
        />
      </label>
      <div className="pickup-confirmation__location">
        <div>
          <strong>{currentLocation ? 'GPS capturado' : 'Confirmar localização'}</strong>
          <span>
            {currentLocation
              ? coordinateLabel(currentLocation)
              : `Sem validação de distância. Se o GPS falhar, será usado o ponto cadastrado da ${label}.`}
          </span>
        </div>
        <Button icon="location" onClick={locate}>
          {currentLocation ? 'Atualizar GPS' : 'Usar GPS'}
        </Button>
      </div>
      {locationMessage ? <output className="pickup-confirmation__location-message">{locationMessage}</output> : null}
      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}
      <div className="pickup-confirmation__actions">
        <Button disabled={busy} onClick={onCancel} variant="ghost">Cancelar</Button>
        <Button disabled={busy} icon="check" onClick={() => void submit()} variant="primary">
          Confirmar {label}
        </Button>
      </div>
    </div>
  )
}
