import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OffersHeader } from './OffersHeader'

describe('offers header', () => {
  it('presents demo offers as real, without a simulation notice', () => {
    const markup = renderToStaticMarkup(<OffersHeader hasSimulatedOffers />)

    expect(markup).toContain('Nova oferta')
    expect(markup).not.toContain('SIMULADO')
    expect(markup).not.toContain('ofertas de demonstração')
  })
})
