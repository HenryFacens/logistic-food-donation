import type { DonationStatus } from '@resgata/shared'
import type { ApiClient } from '../../../shared/api'
import {
  AppIcon,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../../../shared/ui'
import { useDonationEvents } from '../api/donations'
import { donationMessages } from '../messages'
import {
  eventLabel,
  formatDateTime,
  formatTime,
  nextDonationStepLabel,
} from '../model/donationView'

interface DonationTimelineProps {
  apiClient: ApiClient
  donationId: string
  presentation?: 'default' | 'mobile'
  status?: DonationStatus
}

export function DonationTimeline({
  apiClient,
  donationId,
  presentation = 'default',
  status,
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

  if (presentation === 'mobile') {
    const nextStep = status ? nextDonationStepLabel(status) : null

    return (
      <div className="producer-timeline">
        <ol>
          {eventsQuery.data.map((event) => (
            <li key={event.id}>
              <span className="producer-timeline__marker">
                <AppIcon name="check" size={17} />
              </span>
              <div>
                <strong>{eventLabel(event.eventType, event.toStatus)}</strong>
                <time dateTime={event.occurredAt}>
                  {formatTime(event.occurredAt)}
                </time>
              </div>
            </li>
          ))}
          {nextStep ? (
            <li className="producer-timeline__next">
              <span className="producer-timeline__marker" />
              <div>
                <small>{donationMessages.nextStep}</small>
                <strong>{nextStep}</strong>
              </div>
            </li>
          ) : null}
        </ol>
      </div>
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
