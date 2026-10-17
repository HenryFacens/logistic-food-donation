import type { Offer } from '@resgata/shared'
import { useState } from 'react'
import { AppIcon, Button, StatusBadge } from '../../../shared/ui'
import { getErrorMessage, offerMessages } from '../messages'
import {
  mapOfferDecision,
  offerReasons,
  offerResponseWindow,
  offerSummary,
  offerTitle,
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

/** A pending offer: what it is, why it fits, and the decision. */
export function OfferCard({ deciding, offer, onDecision }: OfferCardProps) {
  const [error, setError] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const decision = mapOfferDecision(offer)
  const condition = offer.donation?.classification?.condition

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
          action === 'accept' ? offerMessages.acceptError : offerMessages.rejectError,
        ),
      )
    }
  }

  return (
    <article className="screen-card offer-card">
      {offer.donation?.imageUrl ? (
        <img
          alt={`Foto de ${offerTitle(offer)}`}
          className="offer-card__photo"
          loading="lazy"
          src={offer.donation.imageUrl}
        />
      ) : null}

      <div className="offer-card__summary">
        <h2>{offerTitle(offer)}</h2>
        <p>{offerSummary(offer)}</p>
        {offer.donation ? (
          <p>
            Retirada em {offer.donation.pickupAddress.district},{' '}
            {offer.donation.pickupAddress.city}
          </p>
        ) : null}
      </div>

      <ul className="offer-card__reasons" aria-label="Por que esta doação combina com vocês">
        {offerReasons(offer).map((item) => (
          <li key={item.text}>
            <AppIcon name={item.icon} size={18} />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>

      {condition ? (
        <p className={`offer-card__condition offer-card__condition--${condition}`}>
          <AppIcon name={condition === 'good' ? 'check' : 'warning'} size={18} />
          <span>
            <strong>
              {condition === 'good' ? offerMessages.conditionGood : offerMessages.conditionAttention}
            </strong>
            {offer.donation?.classification?.conditionNotes
              ? ` ${offer.donation.classification.conditionNotes}`
              : ''}
          </span>
        </p>
      ) : null}

      {error ? (
        <p className="offer-card__error" role="alert">
          {error}
        </p>
      ) : null}

      {decision.canDecide && showReject ? (
        <div className="offer-card__form">
          <label htmlFor={`reason-${offer.id}`}>Por que não? (opcional)</label>
          <textarea
            id={`reason-${offer.id}`}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: sem geladeira livre hoje"
            value={reason}
          />
          <div className="offer-card__actions">
            <Button disabled={deciding} onClick={() => setShowReject(false)} variant="ghost">
              Voltar
            </Button>
            <Button disabled={deciding} onClick={() => void decide('reject')} variant="secondary">
              Confirmar recusa
            </Button>
          </div>
        </div>
      ) : null}

      {decision.canDecide && !showReject ? (
        <>
          <p className="offer-card__deadline">
            <AppIcon name="clock" size={18} />
            {offerResponseWindow(offer)}
          </p>
          <div className="offer-card__actions">
            <Button disabled={deciding} onClick={() => setShowReject(true)} variant="secondary">
              Não podemos
            </Button>
            <Button
              disabled={deciding}
              icon="check"
              onClick={() => void decide('accept')}
              variant="primary"
            >
              {deciding ? 'Aceitando…' : 'Aceitar doação'}
            </Button>
          </div>
        </>
      ) : null}

      {!decision.canDecide ? (
        <div className="offer-card__closed">
          <StatusBadge
            label={decision.statusLabel}
            tone={offer.status === 'accepted' ? 'success' : 'neutral'}
          />
        </div>
      ) : null}
    </article>
  )
}

/** Past offers stay visible as one line each. */
export function OfferHistoryRow({ offer }: { offer: Offer }) {
  const decision = mapOfferDecision(offer)
  return (
    <li className="offer-history-row">
      <div>
        <strong>{offerTitle(offer)}</strong>
        <span>
          {new Date(offer.acceptedAt ?? offer.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          })}
          {offer.donation ? ` · ${offer.donation.estimatedWeightKg.toLocaleString('pt-BR')} kg` : ''}
        </span>
      </div>
      <StatusBadge
        label={decision.statusLabel}
        tone={offer.status === 'accepted' ? 'success' : 'neutral'}
      />
    </li>
  )
}
