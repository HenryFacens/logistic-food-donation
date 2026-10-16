import { Button, EmptyState, LoadingState } from '../../../shared/ui'
import { useOfferDecision, useOffers } from '../api/useOffers'
import { OfferCard } from '../components/OfferCard'
import { offerMessages } from '../messages'

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
    <div className="grid gap-4">
      <div>
        <span className="eyebrow">Decisão rápida</span>
        <p className="mb-0">Avalie aderência, prazo e logística antes de responder.</p>
      </div>
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
