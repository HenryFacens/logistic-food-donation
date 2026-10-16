import type { ApiClient } from '../../../shared/api'
import { navigate } from '../../../shared/routing'
import { Button, EmptyState, LoadingState } from '../../../shared/ui'
import { useDonations } from '../api/donations'
import { donationMessages } from '../messages'
import { DonationCard } from './DonationCard'

interface SellerDonationSectionProps {
  apiClient: ApiClient
  compact?: boolean
  limit?: number
  onDonate?(): void
  showHeading?: boolean
}

export function SellerDonationSection({
  apiClient,
  compact = false,
  limit = compact ? 5 : 50,
  onDonate = () => navigate('/doar'),
  showHeading = true,
}: SellerDonationSectionProps) {
  const donationsQuery = useDonations(apiClient, { limit })

  return (
    <section className="grid gap-5" aria-labelledby="seller-donations-title">
      {showHeading ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">{donationMessages.listEyebrow}</span>
            <h1
              className="mb-2 text-3xl font-black"
              id="seller-donations-title"
            >
              {donationMessages.listTitle}
            </h1>
            <p className="mb-0">{donationMessages.listDescription}</p>
          </div>
          <Button icon="donation" onClick={onDonate} variant="primary">
            Nova doação
          </Button>
        </div>
      ) : null}

      {donationsQuery.isLoading ? (
        <LoadingState label={donationMessages.loading} />
      ) : null}

      {donationsQuery.isError ? (
        <EmptyState
          action={
            <Button
              icon="refresh"
              onClick={() => void donationsQuery.refetch()}
              variant="primary"
            >
              {donationMessages.retry}
            </Button>
          }
          description={donationsQuery.error.message}
          icon="warning"
          title={donationMessages.errorTitle}
        />
      ) : null}

      {donationsQuery.data && !donationsQuery.data.items.length ? (
        <EmptyState
          action={
            <Button icon="donation" onClick={onDonate} variant="primary">
              Publicar primeira doação
            </Button>
          }
          description={donationMessages.emptyDescription}
          icon="donation"
          title={donationMessages.emptyTitle}
        />
      ) : null}

      {donationsQuery.data?.items.length ? (
        <div className="grid gap-4">
          {donationsQuery.data.items.map((donation) => (
            <DonationCard
              apiClient={apiClient}
              compact={compact}
              donation={donation}
              key={donation.id}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
