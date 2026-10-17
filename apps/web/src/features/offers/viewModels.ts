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

const unitLabels: Record<string, string> = {
  box: 'caixas',
  kg: 'kg',
  tray: 'bandejas',
  unit: 'unidades',
}

const withoutSimulationMarker = (value: string) =>
  value
    .replace(/\bSIMULADO\b/giu, '')
    .replace(/\s*[-—·]\s*(?=\p{L}|\p{N})/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

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
  offer.donation?.description
    ? withoutSimulationMarker(offer.donation.description)
    : `Doação ${offer.donationId.slice(0, 8)}`

export const offerSummary = (offer: Offer) => {
  const donation = offer.donation
  if (!donation) return 'Detalhes da doação serão exibidos após a sincronização.'
  const category = donation.category
    ? categoryLabels[donation.category] || donation.category
    : 'Categoria pendente'
  return `${category} · ${donation.quantity} ${unitLabels[donation.unit] || donation.unit} · ${donation.estimatedWeightKg} kg estimados`
}

export const offerFreshnessLabel = (offer: Offer) => {
  const minutes = offer.donation?.perishabilityMinutes
  if (!minutes) return null
  if (minutes < 60) return `Bom para consumo por ~${minutes} min`
  const hours = Math.max(1, Math.round(minutes / 60))
  return `Bom para consumo por ~${hours}h`
}

export const offerResponseWindow = (
  offer: Pick<Offer, 'expiresAt' | 'status'>,
  now = new Date(),
) => {
  if (offer.status !== 'pending') return offerStatusLabels[offer.status]
  const milliseconds = new Date(offer.expiresAt).getTime() - now.getTime()
  if (milliseconds <= 0) return 'Prazo encerrado'
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0
    ? `Responder em ${hours}h ${minutes.toString().padStart(2, '0')}min`
    : `Responder em ${minutes} min`
}

export interface OfferReason {
  icon: 'navigation' | 'heart' | 'clock' | 'box'
  text: string
}

/** Why this donation fits the NGO, as plain sentences (no scores). */
export const offerReasons = (offer: Offer): OfferReason[] => {
  const reasons: OfferReason[] = []
  const match = offer.score.needMatch
  if (match) {
    const unit = unitLabels[match.unit] ?? match.unit
    reasons.push({
      icon: 'heart',
      text:
        match.coveredQuantity !== null
          ? `Atende sua solicitação de ${match.item}: cobre ~${match.coveredQuantity.toLocaleString('pt-BR')} de ${match.remainingQuantity.toLocaleString('pt-BR')} ${unit}`
          : `Atende sua solicitação de ${match.item}`,
    })
  }
  if (offer.distanceKm !== undefined) {
    const km = offer.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    reasons.push({
      icon: 'navigation',
      text:
        offer.etaMinutes !== undefined
          ? `${km} km de vocês, ~${offer.etaMinutes} min de carro`
          : `${km} km de vocês`,
    })
  }
  const freshness = offerFreshnessLabel(offer)
  if (freshness) reasons.push({ icon: 'clock', text: freshness })
  return reasons
}
