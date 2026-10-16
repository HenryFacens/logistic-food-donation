import type { ApiClient } from '../../../shared/api'
import { EmptyState, LoadingState, StatusBadge } from '../../../shared/ui'
import { useDonationEvents } from '../api/donations'
import { donationMessages } from '../messages'
import { eventLabel, formatDateTime } from '../model/donationView'

interface DonationTimelineProps {
  apiClient: ApiClient
  donationId: string
}

export function DonationTimeline({
  apiClient,
  donationId,
}: DonationTimelineProps) {
  const eventsQuery = useDonationEvents(apiClient, donationId)

  if (eventsQuery.isLoading) {
    return <LoadingState label={donationMessages.timelineLoading} />
  }

  if (eventsQuery.isError) {
    return (
      <div className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
        {eventsQuery.error.message}
      </div>
    )
  }

  if (!eventsQuery.data?.length) {
    return (
      <EmptyState
        description={donationMessages.timelineEmpty}
        icon="donation"
        title="Histórico em processamento"
      />
    )
  }

  return (
    <ol className="grid gap-0 border-l-2 border-border pl-5">
      {eventsQuery.data.map((event) => (
        <li className="relative pb-5 last:pb-0" key={event.id}>
          <span className="absolute -left-[1.72rem] top-1 size-3 rounded-full border-2 border-surface bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">
              {eventLabel(event.eventType, event.toStatus)}
            </strong>
            <StatusBadge
              label={formatDateTime(event.occurredAt)}
              tone="neutral"
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
