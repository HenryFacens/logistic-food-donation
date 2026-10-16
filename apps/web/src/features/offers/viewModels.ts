import type { MatchingScore, Offer, OfferStatus } from '@resgata/shared'

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const categoryLabels: Record<string, string> = {
  bakery: 'Padaria',
  dairy: 'Laticínios',
  other: 'Outros',
  pantry: 'Mercearia',
  prepared: 'Refeição pronta',
  produce: 'Hortifruti',
}

export const offerStatusLabels: Record<OfferStatus, string> = {
  accepted: 'Aceita',
  cancelled: 'Cancelada',
  declined: 'Recusada',
  pending: 'Aguardando decisão',
  timed_out: 'Prazo encerrado',
}

export const scoreExplanations = (score: MatchingScore) => [
  {
    label: 'Proximidade',
    value: score.components.distance.contribution,
    detail: `${score.components.distance.normalized * 100}% de aderência`,
  },
  {
    label: 'Capacidade',
    value: score.components.capacity.contribution,
    detail: `${score.components.capacity.normalized * 100}% de aderência`,
  },
  {
    label: 'Urgência',
    value: score.components.perishability.contribution,
    detail: `${score.components.perishability.normalized * 100}% de aderência`,
  },
  {
    label: 'Necessidade',
    value: score.components.categoryNeed.contribution,
    detail: `${score.components.categoryNeed.normalized * 100}% de aderência`,
  },
]

export interface OfferDecisionViewModel {
  canDecide: boolean
  expirationLabel: string
  expired: boolean
  statusLabel: string
}

export const mapOfferDecision = (
  offer: Pick<Offer, 'expiresAt' | 'status'>,
  now = new Date(),
): OfferDecisionViewModel => {
  const expiresAt = new Date(offer.expiresAt)
  const expired = expiresAt.getTime() <= now.getTime()
  return {
    canDecide: offer.status === 'pending' && !expired,
    expirationLabel: expired
      ? `Expirou em ${dateTime.format(expiresAt)}`
      : `Responder até ${dateTime.format(expiresAt)}`,
    expired,
    statusLabel: expired && offer.status === 'pending'
      ? 'Prazo encerrado'
      : offerStatusLabels[offer.status],
  }
}

export const offerTitle = (offer: Offer) =>
  offer.donation?.description || `Doação ${offer.donationId.slice(0, 8)}`

export const offerSummary = (offer: Offer) => {
  const donation = offer.donation
  if (!donation) return 'Detalhes da doação serão exibidos após a sincronização.'
  const category = donation.category
    ? categoryLabels[donation.category] || donation.category
    : 'Categoria pendente'
  return `${category} · ${donation.quantity} ${donation.unit} · ${donation.estimatedWeightKg} kg estimados`
}
