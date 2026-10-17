import { Button, EmptyState, LoadingState } from '../../../shared/ui'
import { useOfferDecision, useOffers } from '../api/useOffers'
import { OfferCard } from '../components/OfferCard'
import { OffersHeader } from '../components/OffersHeader'
import { offerMessages } from '../messages'
import '../offers.css'

export function NgoOffersPage() {
  const offers = useOffers()
  const decision = useOfferDecision()

  if (offers.isPending) return <LoadingState label="Buscando ofertas compatíveis" />
  if (offers.isError) {
    return (
      <EmptyState
        action={<Button icon="refresh" onClick={() => void offers.refetch()}>Tentar novamente</Button>}
        description={offerMessages.loadError}
        icon="warning"
        title="Falha ao carregar"
      />
    )
  }
  if (!offers.data.items.length) {
    return (
      <EmptyState
        description={offerMessages.emptyDescription}
        title={offerMessages.emptyTitle}
      />
    )
  }

  return (
    <div className="offers-screen">
      <OffersHeader
        hasSimulatedOffers={offers.data.items.some(
          (offer) => offer.donation?.simulated === true,
        )}
      />
      {offers.data.items.map((offer) => (
        <OfferCard
          deciding={decision.isPending && decision.variables?.offerId === offer.id}
          key={offer.id}
          offer={offer}
          onDecision={decision.mutateAsync}
        />
      ))}
    </div>
  )
}
