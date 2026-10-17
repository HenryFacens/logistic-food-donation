import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OffersHeader } from './OffersHeader'

describe('offers header simulation notice', () => {
  it('renders a single contextual SIMULADO notice when the list contains simulated offers', () => {
    const markup = renderToStaticMarkup(
      <OffersHeader hasSimulatedOffers />,
    )

    expect(markup.match(/SIMULADO/g)).toHaveLength(1)
    expect(markup).toContain('Esta lista contém ofertas de demonstração.')
    expect(markup).toContain('role="note"')
  })

  it('does not render a simulation notice for a fully real list', () => {
    const markup = renderToStaticMarkup(
      <OffersHeader hasSimulatedOffers={false} />,
    )

    expect(markup).not.toContain('SIMULADO')
    expect(markup).not.toContain('ofertas de demonstração')
  })
})
