import type { Offer } from '@resgata/shared'
import { useState } from 'react'
import {
  AppIcon,
  Button,
  Card,
  StatusBadge,
} from '../../../shared/ui'
import { getErrorMessage, offerMessages } from '../messages'
import {
  mapOfferDecision,
  offerFreshnessLabel,
  offerResponseWindow,
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
  const [showAcceptance, setShowAcceptance] = useState(false)
  const [logisticsChoice, setLogisticsChoice] = useState<'own' | 'network'>('network')
  const [reason, setReason] = useState('')
  const decision = mapOfferDecision(offer)
  const freshness = offerFreshnessLabel(offer)
  const scoreItems = scoreExplanations(offer.score)

  const decide = async (action: 'accept' | 'reject') => {
    setError(null)
    try {
      await onDecision({
        action,
        offerId: offer.id,
        reason: action === 'reject' && reason.trim() ? reason.trim() : undefined,
      })
      setShowReject(false)
      setShowAcceptance(false)
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
    <Card className="offer-card">
      <div className="offer-card__topline">
        <StatusBadge
          icon="clock"
          label={offerResponseWindow(offer)}
          tone={decision.canDecide ? 'danger' : offer.status === 'accepted' ? 'success' : 'neutral'}
        />
      </div>

      <div className="offer-card__summary">
        <span className="eyebrow">Compatibilidade #{offer.rank}</span>
        <h2>{offerTitle(offer)}</h2>
        <p>{offerSummary(offer)}</p>
      </div>

      {offer.donation ? (
        <div className="offer-card__facts">
          <div>
            <span>Retirada</span>
            <strong>
              {offer.donation.pickupAddress.district}, {offer.donation.pickupAddress.city}
            </strong>
          </div>
          <div>
            <span>Disponível a partir de</span>
            <strong>{new Date(offer.donation.availableFrom).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
        </div>
      ) : null}

      <div className="offer-card__match">
        <div className="offer-card__match-heading">
          <span className="offer-card__check">
            <AppIcon name="check" size={18} />
          </span>
          <div className="offer-card__match-copy">
            <strong>{Math.round(offer.score.total)}% compatível</strong>
            {freshness ? <span>{freshness}</span> : null}
          </div>
        </div>
        <div className="offer-card__reasons" aria-label="Motivos da compatibilidade">
          {scoreItems.map((item) => (
            <span key={item.label}>
              {item.label} {Math.round(Number.parseFloat(item.detail))}%
            </span>
          ))}
        </div>
      </div>

      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}

      {showReject && decision.canDecide ? (
        <div className="offer-card__form">
          <label className="font-bold" htmlFor={`reason-${offer.id}`}>Motivo opcional</label>
          <textarea
            id={`reason-${offer.id}`}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: sem capacidade refrigerada hoje"
            value={reason}
          />
          <div className="offer-card__actions">
            <Button disabled={deciding} onClick={() => setShowReject(false)} variant="ghost">Cancelar</Button>
            <Button disabled={deciding} icon="warning" onClick={() => void decide('reject')}>
              Confirmar recusa
            </Button>
          </div>
        </div>
      ) : null}

      {decision.canDecide && !showReject && !showAcceptance ? (
        <div className="offer-card__actions">
          <Button disabled={deciding} icon="warning" onClick={() => setShowReject(true)}>
            Recusar
          </Button>
          <Button disabled={deciding} icon="check" onClick={() => setShowAcceptance(true)} variant="primary">
            Aceitar
          </Button>
        </div>
      ) : null}

      {showAcceptance && decision.canDecide ? (
        <section
          aria-label={offerMessages.acceptanceChoiceTitle}
          className="offer-card__sheet"
        >
          <div className="offer-card__sheet-handle" />
          <div className="offer-card__sheet-title">
            <div>
              <h3>{offerMessages.acceptanceChoiceTitle}</h3>
              <p>Reservaremos esta doação para a entidade agora.</p>
            </div>
          </div>
          <div className="offer-card__logistics" role="radiogroup" aria-label="Preferência logística simulada">
            <label
              className={logisticsChoice === 'own' ? 'is-selected' : ''}
            >
              <input
                checked={logisticsChoice === 'own'}
                name={`logistics-${offer.id}`}
                onChange={() => setLogisticsChoice('own')}
                type="radio"
                value="own"
              />
              <span><AppIcon name="truck" size={26} /></span>
              <span><strong>Vamos buscar</strong><small>Usamos nosso veículo</small></span>
            </label>
            <label
              className={logisticsChoice === 'network' ? 'is-selected' : ''}
            >
              <input
                checked={logisticsChoice === 'network'}
                name={`logistics-${offer.id}`}
                onChange={() => setLogisticsChoice('network')}
                type="radio"
                value="network"
              />
              <span><AppIcon name="user" size={26} /></span>
              <span><strong>Precisamos de coletador</strong><small>Aguardamos alguém da rede</small></span>
            </label>
          </div>
          <p className="offer-card__simulation-note">
            {offerMessages.acceptanceChoiceDescription}
          </p>
          <div className="offer-card__actions">
            <Button disabled={deciding} onClick={() => setShowAcceptance(false)} variant="ghost">
              Voltar
            </Button>
            <Button disabled={deciding} icon="check" onClick={() => void decide('accept')} variant="primary">
              Aceitar oferta
            </Button>
          </div>
        </section>
      ) : null}

      {!decision.canDecide ? (
        <div className="offer-card__closed">
          <StatusBadge label={decision.statusLabel} tone={offer.status === 'accepted' ? 'success' : 'neutral'} />
          <span>{decision.expirationLabel}</span>
        </div>
      ) : null}
    </Card>
  )
}
