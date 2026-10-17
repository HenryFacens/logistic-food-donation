import type { DonationStatus, OfferStatus } from '@resgata/shared'
import type { ApiClient } from '../../../shared/api'
import { LoadingState, StatusBadge, type StatusTone } from '../../../shared/ui'
import { useDonationMatching } from '../api/donations'
import { donationMessages } from '../messages'

const reasonLabels: Record<string, string> = {
  category_not_accepted: 'não recebe esta categoria',
  eta_exceeds_perishability: 'não chega antes de estragar',
  insufficient_capacity: 'sem espaço livre hoje',
  outside_receiving_hours: 'fechada até depois da validade',
  outside_service_radius: 'fora do raio de atendimento',
}

const offerLabels: Record<OfferStatus, { label: string; tone: StatusTone }> = {
  accepted: { label: 'Aceitou', tone: 'success' },
  cancelled: { label: 'Oferta encerrada', tone: 'neutral' },
  declined: { label: 'Recusou', tone: 'danger' },
  pending: { label: 'Oferta enviada', tone: 'warning' },
  timed_out: { label: 'Sem resposta', tone: 'neutral' },
}

const km = (value: number) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`

interface MatchingExplanationProps {
  apiClient: ApiClient
  donationId: string
  status: DonationStatus
}

/** Live "why this NGO?" ranking straight from the matching run. */
export function MatchingExplanation({
  apiClient,
  donationId,
  status,
}: MatchingExplanationProps) {
  const matching = useDonationMatching(apiClient, donationId, status)

  if (matching.isPending) return <LoadingState label={donationMessages.matchingLoading} />
  if (matching.isError) {
    return <p className="mb-0 text-sm text-danger">{matching.error.message}</p>
  }
  const { candidates, outOfRange, runAt } = matching.data
  if (!runAt) {
    return <LoadingState label={donationMessages.matchingPending} />
  }

  return (
    <div className="grid gap-3">
      <p className="mb-0 text-sm">
        {donationMessages.matchingSummary(candidates.length, outOfRange.length)}{' '}
        {new Date(runAt).toLocaleTimeString('pt-BR')}.
      </p>
      <ol className="m-0 grid list-none gap-2 p-0">
        {candidates.map((candidate) => {
          const offer = candidate.offerStatus ? offerLabels[candidate.offerStatus] : null
          return (
            <li
              className={`grid gap-1 rounded-control border p-3 ${
                candidate.offerStatus === 'accepted'
                  ? 'border-success/40 bg-success/10'
                  : candidate.eligible
                    ? 'border-border'
                    : 'border-border opacity-70'
              }`}
              key={candidate.ngoId}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {candidate.rank}º · {candidate.ngoName}
                </strong>
                <span className="flex flex-wrap items-center gap-2">
                  {offer ? <StatusBadge label={offer.label} tone={offer.tone} /> : null}
                  <strong className="text-lg">{Math.round(candidate.score)}</strong>
                </span>
              </div>
              <span className="text-sm">
                {km(candidate.distanceKm)} · ~{candidate.etaMinutes} min de carro
                {candidate.needScore >= 0.6 ? ` · ${donationMessages.openNeed}` : ''}
              </span>
              {candidate.rejectionReasons.length ? (
                <span className="text-sm font-bold text-danger">
                  {donationMessages.excluded}{' '}
                  {candidate.rejectionReasons
                    .map((reason) => reasonLabels[reason] ?? reason)
                    .join(', ')}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
      {outOfRange.length ? (
        <p className="mb-0 text-sm">
          {donationMessages.outOfRange}{' '}
          {outOfRange
            .map((ngo) => `${ngo.ngoName} (${km(ngo.distanceKm)}, raio ${km(ngo.serviceRadiusKm)})`)
            .join('; ')}
        </p>
      ) : null}
    </div>
  )
}
