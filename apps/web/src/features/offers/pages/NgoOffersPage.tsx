import { useState } from 'react'
import { Button, EmptyState, LoadingState } from '../../../shared/ui'
import { useOfferDecision, useOffers } from '../api/useOffers'
import { OfferCard, OfferHistoryRow } from '../components/OfferCard'
import { offerMessages } from '../messages'
import { mapOfferDecision } from '../viewModels'
import '../offers.css'

export function NgoOffersPage() {
  const offers = useOffers()
  const decision = useOfferDecision()
  const [showAll, setShowAll] = useState(false)

  if (offers.isPending) return <LoadingState label="Buscando doações para vocês" />
  if (offers.isError && !offers.data) {
    return (
      <EmptyState
        action={<Button icon="refresh" onClick={() => void offers.refetch()}>Tentar novamente</Button>}
        description={offerMessages.loadError}
        icon="warning"
        title="Não foi possível carregar as doações"
      />
    )
  }

  const items = offers.data.items
  const pending = items.filter((offer) => mapOfferDecision(offer).canDecide)
  const history = items.filter((offer) => !mapOfferDecision(offer).canDecide)
  const historyShown = showAll ? history : history.slice(0, 5)

  return (
    <div className="offers-screen">
      <header className="offers-screen__header">
        <h1>Doações para vocês</h1>
        <p>
          {pending.length
            ? `${pending.length} ${pending.length === 1 ? 'doação espera' : 'doações esperam'} sua resposta.`
            : 'Nenhuma doação esperando resposta. Avisamos aqui quando chegar uma que combine com suas solicitações.'}
        </p>
      </header>

      {pending.map((offer) => (
        <OfferCard
          deciding={decision.isPending && decision.variables?.offerId === offer.id}
          key={offer.id}
          offer={offer}
          onDecision={decision.mutateAsync}
        />
      ))}

      {!pending.length ? (
        <EmptyState
          description={offerMessages.emptyDescription}
          icon="heart"
          title={offerMessages.emptyTitle}
        />
      ) : null}

      {history.length ? (
        <section className="offers-history">
          <h2>Respondidas</h2>
          <ul className="screen-card offers-history__list">
            {historyShown.map((offer) => (
              <OfferHistoryRow key={offer.id} offer={offer} />
            ))}
          </ul>
          {history.length > historyShown.length ? (
            <Button onClick={() => setShowAll(true)} variant="ghost">
              Ver todas ({history.length})
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
