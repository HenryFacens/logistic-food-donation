import type { Donation } from '@resgata/shared'
import { useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { Button, Card, SimuladoBadge, StatusBadge } from '../../../shared/ui'
import { donationMessages } from '../messages'
import {
  donationCategoryLabels,
  donationStatusView,
  donationUnitLabels,
  formatDateTime,
} from '../model/donationView'
import { DonationTimeline } from './DonationTimeline'

interface DonationCardProps {
  apiClient: ApiClient
  compact?: boolean
  donation: Donation
}

export function DonationCard({
  apiClient,
  compact = false,
  donation,
}: DonationCardProps) {
  const [timelineOpen, setTimelineOpen] = useState(false)
  const status = donationStatusView[donation.status]

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">
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
            {donation.pickupAddress.district}, Campinas
          </dd>
        </div>
        <div>
          <dt className="font-bold text-muted">Disponível até</dt>
          <dd className="m-0 text-text">{formatDateTime(donation.expiresAt)}</dd>
        </div>
      </dl>

      {!compact || timelineOpen ? (
        <div>
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

      {timelineOpen ? (
        <div className="border-t border-border pt-4">
          <DonationTimeline apiClient={apiClient} donationId={donation.id} />
        </div>
      ) : null}
    </Card>
  )
}
