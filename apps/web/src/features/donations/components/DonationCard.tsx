import type { Donation } from '@resgata/shared'
import { useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import {
  AppIcon,
  Button,
  Card,
  StatusBadge,
} from '../../../shared/ui'
import { donationMessages } from '../messages'
import {
  donationCategoryLabels,
  donationStatusView,
  donationUnitLabels,
  formatDateTime,
  formatRemainingTime,
} from '../model/donationView'
import { DonationTimeline } from './DonationTimeline'
import { MatchingExplanation } from './MatchingExplanation'

const PLACING: readonly Donation['status'][] = ['posted', 'classified', 'offered']

type NextStep = { icon: 'clock' | 'truck' | 'heart' | 'check'; text: string }

/** What happens next, in the donor's words. */
function nextStepFor(donation: Donation): NextStep {
  const pickup = donation.pickup ?? null
  switch (donation.status) {
    case 'posted':
    case 'classified':
      return { icon: 'clock', text: 'Procurando a ONG certa para esta doação…' }
    case 'offered':
      return {
        icon: 'heart',
        text: `Oferecida às ONGs. Falta ${formatRemainingTime(donation.expiresAt)} para o prazo de retirada.`,
      }
    case 'accepted':
      return pickup?.driverName
        ? { icon: 'truck', text: `${pickup.driverName} está a caminho para buscar.` }
        : {
            icon: 'clock',
            text: `${pickup?.ngoName ?? 'Uma ONG'} aceitou. Procurando motorista.`,
          }
    case 'collected':
      return { icon: 'truck', text: `Coletada. A caminho de ${pickup?.ngoName ?? 'a ONG'}.` }
    default:
      return { icon: 'check', text: '' }
  }
}

interface DonationCardProps {
  apiClient: ApiClient
  compact?: boolean
  defaultExpanded?: boolean
  donation: Donation
  presentation?: 'default' | 'mobile'
}

export function DonationCard({
  apiClient,
  compact = false,
  defaultExpanded = false,
  donation,
  presentation = 'default',
}: DonationCardProps) {
  const [timelineOpen, setTimelineOpen] = useState(defaultExpanded)
  // Open by default while the donation is being placed, so the ranking is
  // visible live right after publishing.
  const [matchingOpen, setMatchingOpen] = useState(
    !compact && PLACING.includes(donation.status),
  )
  const status = donationStatusView[donation.status]
  const terminal = ['delivered', 'expired', 'no_destination'].includes(
    donation.status,
  )

  if (presentation === 'mobile') {
    const pickup = donation.pickup ?? null
    const next = nextStepFor(donation)
    return (
      <article
        className={`producer-donation${terminal ? ' producer-donation--done' : ''}`}
      >
        <section className="screen-card producer-donation__summary">
          <div className="producer-donation__head">
            <div>
              <h2>{donation.description}</h2>
              <span>
                {donation.unit === 'kg'
                  ? `${donation.estimatedWeightKg.toLocaleString('pt-BR')} kg`
                  : `${donation.quantity} ${donationUnitLabels[donation.unit]} · ${donation.estimatedWeightKg.toLocaleString('pt-BR')} kg`}
                {terminal
                  ? ` · ${formatDateTime(donation.updatedAt)}`
                  : ` · retirar até ${formatDateTime(donation.expiresAt)}`}
              </span>
            </div>
            <StatusBadge label={status.label} tone={status.tone} />
          </div>

          {!terminal ? (
            <p className="producer-donation__next">
              <AppIcon name={next.icon} size={20} />
              <span>{next.text}</span>
            </p>
          ) : null}

          {pickup?.pickupCode && !pickup.collectedAt ? (
            <div className="producer-pickup-code">
              <span>Código de retirada</span>
              <strong className="code-value">{pickup.pickupCode}</strong>
              <small>
                {pickup.driverName
                  ? `Diga este código para ${pickup.driverName} quando ${
                      pickup.driverName.split(' ')[0]
                    } chegar para buscar.`
                  : 'Diga este código ao motorista quando ele chegar para buscar.'}
              </small>
            </div>
          ) : null}

          {pickup ? (
            <dl className="producer-donation__facts">
              <div>
                <dt>Vai para</dt>
                <dd>{pickup.ngoName}</dd>
              </div>
              <div>
                <dt>Motorista</dt>
                <dd>
                  {pickup.driverName
                    ? `${pickup.driverName}${pickup.vehicle ? ` · ${pickup.vehicle}` : ''}`
                    : 'Procurando motorista'}
                </dd>
              </div>
            </dl>
          ) : null}

          <button
            aria-expanded={timelineOpen || matchingOpen}
            className="producer-donation__more"
            onClick={() => {
              const open = !(timelineOpen || matchingOpen)
              setTimelineOpen(open)
              setMatchingOpen(open)
            }}
            type="button"
          >
            {timelineOpen || matchingOpen
              ? 'Ocultar detalhes'
              : terminal
                ? 'Detalhes'
                : 'Ver histórico e por que esta ONG'}
            <AppIcon
              name={timelineOpen || matchingOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
            />
          </button>
        </section>

        {matchingOpen ? (
          <section className="screen-card producer-donation__detail">
            <h3>Por que esta ONG</h3>
            <MatchingExplanation
              apiClient={apiClient}
              donationId={donation.id}
              status={donation.status}
            />
          </section>
        ) : null}
        {timelineOpen ? (
          <section className="screen-card producer-donation__detail">
            <h3>Histórico</h3>
            <DonationTimeline
              apiClient={apiClient}
              donationId={donation.id}
              presentation="mobile"
              status={donation.status}
            />
          </section>
        ) : null}
      </article>
    )
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-medium text-muted">
            {donation.category
              ? donationCategoryLabels[donation.category]
              : 'Aguardando classificação'}
          </p>
          <h3 className="mb-1 text-lg font-extrabold">{donation.description}</h3>
          <p className="mb-0 text-sm">
            {donation.quantity} {donationUnitLabels[donation.unit]} ·{' '}
            {donation.estimatedWeightKg.toLocaleString('pt-BR')} kg estimados
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <StatusBadge label={status.label} tone={status.tone} />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold text-muted">Retirada</dt>
          <dd className="m-0 text-text">
            {donation.pickupAddress.district}, {donation.pickupAddress.city}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-muted">Disponível até</dt>
          <dd className="m-0 text-text">{formatDateTime(donation.expiresAt)}</dd>
        </div>
      </dl>

      {!compact || timelineOpen || matchingOpen ? (
        <div className="flex flex-wrap gap-2">
          <Button
            aria-expanded={matchingOpen}
            className="w-full sm:w-auto"
            onClick={() => setMatchingOpen((current) => !current)}
            variant="secondary"
          >
            {matchingOpen ? donationMessages.hideMatching : donationMessages.matching}
          </Button>
          <Button
            aria-expanded={timelineOpen}
            className="w-full sm:w-auto"
            onClick={() => setTimelineOpen((current) => !current)}
            variant="secondary"
          >
            {timelineOpen
              ? donationMessages.hideTimeline
              : donationMessages.timeline}
          </Button>
        </div>
      ) : null}

      {matchingOpen ? (
        <div className="border-t border-border pt-4">
          <MatchingExplanation
            apiClient={apiClient}
            donationId={donation.id}
            status={donation.status}
          />
        </div>
      ) : null}

      {timelineOpen ? (
        <div className="border-t border-border pt-4">
          <DonationTimeline apiClient={apiClient} donationId={donation.id} />
        </div>
      ) : null}
    </Card>
  )
}
