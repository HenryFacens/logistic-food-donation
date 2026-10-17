import { SimuladoBadge } from '../../../shared/ui'

interface OffersHeaderProps {
  hasSimulatedOffers: boolean
}

export function OffersHeader({ hasSimulatedOffers }: OffersHeaderProps) {
  return (
    <header className="offers-screen__header">
      <div className="offers-screen__header-copy">
        <span className="eyebrow">Entidade receptora</span>
        <h1>Nova oferta</h1>
        <p>Aceite apenas o que a entidade consegue receber dentro da validade.</p>
      </div>
      {hasSimulatedOffers ? (
        <div className="offers-screen__simulation" role="note">
          <SimuladoBadge />
          <span>Esta lista contém ofertas de demonstração.</span>
        </div>
      ) : null}
    </header>
  )
}
