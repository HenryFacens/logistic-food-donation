import type { GeoPoint, Pickup } from '@resgata/shared'
import { useCallback, useState } from 'react'
import {
  BrowserLocationError,
  browserLocationMessage,
  readBrowserLocation,
} from '../../../shared/maps'
import { Button } from '../../../shared/ui'
import { pickupErrorMessage, pickupMessages } from '../messages'
import {
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
    setLocationMessage('Obtendo localização…')
    readBrowserLocation()
      .then((location) => {
        setCurrentLocation(location)
        setLocationMessage("Localização registrada.")
      })
      .catch((caught: unknown) => {
        setCurrentLocation(null)
        const reason = caught instanceof BrowserLocationError ? caught.reason : 'unavailable'
        setLocationMessage(browserLocationMessage(reason))
      })
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
        <h3>Confirmar {label}</h3>
        <p>
          {action === 'collect'
            ? 'Peça ao doador o código de 6 números que aparece no celular dele.'
            : 'Entregue os alimentos e peça à ONG o código de 6 números.'}
        </p>
      </div>
      <QrCodeReader onCode={readCode} />
      <label className="pickup-confirmation__code" htmlFor={`pickup-code-${pickup.id}-${action}`}>
        <span>Código de 6 números</span>
        <span className="pickup-confirmation__digits" aria-hidden="true">
          {codeDigits.map((digit, index) => (
            <span className={digit ? 'is-filled' : ''} key={index}>{digit}</span>
          ))}
        </span>
        <input
          autoComplete="one-time-code"
          className="min-h-12 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 text-center code-value text-2xl"
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
          <strong>{currentLocation ? 'Localização registrada' : 'Localização (opcional)'}</strong>
          <span>
            {currentLocation
              ? 'Ajuda a comprovar que você estava no local.'
              : 'Se o GPS não funcionar, usamos o endereço cadastrado.'}
          </span>
        </div>
        <Button icon="location" onClick={locate}>
          {currentLocation ? 'Atualizar' : 'Usar GPS'}
        </Button>
      </div>
      {locationMessage ? <output className="pickup-confirmation__location-message">{locationMessage}</output> : null}
      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}
      <div className="pickup-confirmation__actions">
        <Button disabled={busy} onClick={onCancel} variant="secondary">Voltar</Button>
        <Button disabled={busy} icon="check" onClick={() => void submit()} variant="primary">
          {busy ? 'Confirmando…' : `Confirmar ${label}`}
        </Button>
      </div>
    </div>
  )
}
