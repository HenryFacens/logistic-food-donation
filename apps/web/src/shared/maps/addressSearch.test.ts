import { describe, expect, it } from 'vitest'
import { parsePhotonFeature } from './addressSearch'

describe('parsePhotonFeature', () => {
  it('builds a Campinas address from an OpenStreetMap suggestion', () => {
    expect(
      parsePhotonFeature({
        geometry: { coordinates: [-47.0612, -22.9071] },
        properties: {
          city: 'Campinas',
          countrycode: 'BR',
          district: 'Centro',
          housenumber: '650',
          postcode: '13012100',
          state: 'São Paulo',
          street: 'Avenida Francisco Glicério',
        },
      }),
    ).toEqual({
      city: 'Campinas',
      district: 'Centro',
      line1: 'Avenida Francisco Glicério, 650',
      location: { latitude: -22.9071, longitude: -47.0612 },
      postalCode: '13012-100',
      state: 'SP',
    })
  })

  it('ignores places outside Brazil and suggestions without a street', () => {
    expect(
      parsePhotonFeature({
        geometry: { coordinates: [-46.63, -23.55] },
        properties: { countrycode: 'AR', street: 'Calle 1' },
      }),
    ).toBeNull()
    expect(
      parsePhotonFeature({
        geometry: { coordinates: [-47.06, -22.9] },
        properties: { city: 'Campinas', countrycode: 'BR' },
      }),
    ).toBeNull()
  })
})