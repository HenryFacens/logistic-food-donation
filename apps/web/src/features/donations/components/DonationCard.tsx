import type { Donation } from '@resgata/shared'
import { useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import {
  AppIcon,
  Button,
  Card,
  SimuladoBadge,
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
  const pickupIdentificationExpected = ['accepted', 'collected'].includes(
    donation.status,
  )

  if (presentation === 'mobile') {
    return (
      <article className="producer-donation">
        <section className="screen-card producer-donation__summary">
          <div>
            <p>
              {donation.quantity} {donationUnitLabels[donation.unit]} de
            </p>
            <h2>{donation.description}</h2>
            <span>
              {donation.estimatedWeightKg.toLocaleString('pt-BR')} kg · retirada
              até {formatDateTime(donation.expiresAt)}
            </span>
          </div>
          <div className="producer-donation__badges">
            {!terminal ? (
              <StatusBadge
                label={`Atenção · ${formatRemainingTime(donation.expiresAt)}`}
                tone="warning"
              />
            ) : null}
            <StatusBadge label={status.label} tone={status.tone} />
            {donation.simulated ? <SimuladoBadge /> : null}
          </div>
        </section>

        <section className="screen-card producer-donation__progress">
          <button
            aria-expanded={timelineOpen}
            className="producer-donation__progress-toggle"
            onClick={() => setTimelineOpen((current) => !current)}
            type="button"
          >
            <span>
              <small>Andamento real</small>
              <strong>{status.label}</strong>
            </span>
            <span>{timelineOpen ? 'Ocultar' : 'Detalhes'}</span>
          </button>
          {timelineOpen ? (
            <DonationTimeline
              apiClient={apiClient}
              donationId={donation.id}
              presentation="mobile"
              status={donation.status}
            />
          ) : null}
        </section>

        <section className="screen-card producer-donation__progress">
          <button
            aria-expanded={matchingOpen}
            className="producer-donation__progress-toggle"
            onClick={() => setMatchingOpen((current) => !current)}
            type="button"
          >
            <span>
              <small>{donationMessages.matchingEyebrow}</small>
              <strong>{donationMessages.matching}</strong>
            </span>
            <span>{matchingOpen ? 'Ocultar' : 'Detalhes'}</span>
          </button>
          {matchingOpen ? (
            <MatchingExplanation
              apiClient={apiClient}
              donationId={donation.id}
              status={donation.status}
            />
          ) : null}
        </section>

        {pickupIdentificationExpected ? (
          <section className="screen-card producer-pickup-identification">
            <span className="producer-pickup-identification__icon">
              <AppIcon name="scan" size={32} />
            </span>
            <div>
              <strong>{donationMessages.pickupIdentification}</strong>
              <p>{donationMessages.pickupIdentificationUnavailable}</p>
            </div>
          </section>
        ) : null}
      </article>
    )
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-primary">
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
          {donation.simulated ? <SimuladoBadge /> : null}
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
