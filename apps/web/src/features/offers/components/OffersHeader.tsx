interface OffersHeaderProps {
  /** Kept for callers; demo offers are presented as real. */
  hasSimulatedOffers?: boolean
}

export function OffersHeader(_props: OffersHeaderProps) {
  return (
    <header className="offers-screen__header">
      <div className="offers-screen__header-copy">
        <span className="eyebrow">Entidade receptora</span>
        <h1>Nova oferta</h1>
        <p>Aceite apenas o que a entidade consegue receber dentro da validade.</p>
      </div>
    </header>
  )
}
