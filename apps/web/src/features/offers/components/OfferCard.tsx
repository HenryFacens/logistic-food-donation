import type { Offer } from '@resgata/shared'
import { useState } from 'react'
import {
  AppIcon,
  Button,
  Card,
  SimuladoBadge,
  StatusBadge,
} from '../../../shared/ui'
import { getErrorMessage, offerMessages } from '../messages'
import {
  mapOfferDecision,
  offerSummary,
  offerTitle,
  scoreExplanations,
} from '../viewModels'

interface OfferCardProps {
  deciding: boolean
  offer: Offer
  onDecision(input: {
    action: 'accept' | 'reject'
    offerId: string
    reason?: string
  }): Promise<unknown>
}

export function OfferCard({ deciding, offer, onDecision }: OfferCardProps) {
  const [error, setError] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const decision = mapOfferDecision(offer)

  const decide = async (action: 'accept' | 'reject') => {
    setError(null)
    try {
      await onDecision({
        action,
        offerId: offer.id,
        reason: action === 'reject' && reason.trim() ? reason.trim() : undefined,
      })
      setShowReject(false)
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
          action === 'accept'
            ? offerMessages.acceptError
            : offerMessages.rejectError,
        ),
      )
    }
  }

  return (
    <Card className="grid gap-4 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="eyebrow">Compatibilidade #{offer.rank}</span>
          <h2 className="mb-1 text-xl">{offerTitle(offer)}</h2>
          <p className="mb-0">{offerSummary(offer)}</p>
        </div>
        <div className="grid justify-items-end gap-2">
          {offer.donation?.simulated ? <SimuladoBadge /> : null}
          <StatusBadge
            label={decision.statusLabel}
            tone={decision.canDecide ? 'warning' : offer.status === 'accepted' ? 'success' : 'neutral'}
          />
          <span className="text-sm font-bold text-[rgb(var(--color-muted))]">
            {decision.expirationLabel}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-[rgb(var(--color-primary)/0.08)] p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <span className="eyebrow">Índice de aderência</span>
            <strong className="text-3xl">{Math.round(offer.score.total)}%</strong>
          </div>
          <AppIcon name="route" size={30} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {scoreExplanations(offer.score).map((item) => (
            <div className="rounded-xl bg-[rgb(var(--color-surface))] p-3" key={item.label}>
              <span className="block text-xs font-bold text-[rgb(var(--color-muted))]">
                {item.label}
              </span>
              <strong>{item.value.toFixed(1)} pontos</strong>
              <span className="block text-xs text-[rgb(var(--color-muted))]">
                {item.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      {offer.donation?.imageUrl ? (
        <img
          alt={`Foto de ${offerTitle(offer)}`}
          className="max-h-64 w-full rounded-card object-cover"
          loading="lazy"
          src={offer.donation.imageUrl}
        />
      ) : null}

      {offer.donation?.classification?.condition ? (
        <div
          className={`grid gap-1 rounded-control border p-3 text-sm ${
            offer.donation.classification.condition === 'good'
              ? 'border-success/30 bg-success/10'
              : 'border-warning/30 bg-warning/10'
          }`}
        >
          <strong>
            {offer.donation.classification.condition === 'good'
              ? offerMessages.conditionGood
              : offerMessages.conditionAttention}
          </strong>
          {offer.donation.classification.conditionNotes ? (
            <span>{offer.donation.classification.conditionNotes}</span>
          ) : null}
        </div>
      ) : null}

      {offer.distanceKm !== undefined ? (
        <p className="mb-0 flex items-center gap-2 text-sm font-bold">
          <AppIcon name="route" size={18} />
          {offer.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km
          {offer.etaMinutes !== undefined ? ` · ~${offer.etaMinutes} min até vocês` : ''}
        </p>
      ) : null}

      {offer.donation ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <span><strong>Retirada:</strong> {offer.donation.pickupAddress.district}, {offer.donation.pickupAddress.city}</span>
          <span><strong>Disponível:</strong> {new Date(offer.donation.availableFrom).toLocaleString('pt-BR')}</span>
        </div>
      ) : null}

      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}

      {showReject && decision.canDecide ? (
        <div className="grid gap-2 rounded-2xl border border-[rgb(var(--color-border))] p-3">
          <label className="font-bold" htmlFor={`reason-${offer.id}`}>Motivo opcional</label>
          <textarea
            className="min-h-24 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3"
            id={`reason-${offer.id}`}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: sem capacidade refrigerada hoje"
            value={reason}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={deciding} onClick={() => setShowReject(false)} variant="ghost">Cancelar</Button>
            <Button disabled={deciding} icon="warning" onClick={() => void decide('reject')}>
              Confirmar recusa
            </Button>
          </div>
        </div>
      ) : null}

      {decision.canDecide && !showReject ? (
        <div className="grid grid-cols-2 gap-3">
          <Button disabled={deciding} icon="warning" onClick={() => setShowReject(true)}>
            Recusar
          </Button>
          <Button disabled={deciding} icon="check" onClick={() => void decide('accept')} variant="primary">
            Aceitar
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
