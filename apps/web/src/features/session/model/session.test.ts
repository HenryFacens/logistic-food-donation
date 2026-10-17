import { describe, expect, it } from 'vitest'
import {
  buildSessionEntries,
  groupSessionIdentities,
  rolePaths,
  type SessionIdentity,
} from './session'

describe('session model', () => {
  it('orders identities by product role and display name', () => {
    const identities: SessionIdentity[] = [
      { demoKey: 'ngo-b', displayName: 'Zeta', role: 'ngo' },
      { demoKey: 'seller-a', displayName: 'Padaria', role: 'seller' },
      { demoKey: 'ngo-a', displayName: 'Aliança', role: 'ngo' },
    ]

    expect(groupSessionIdentities(identities).map((item) => item.demoKey)).toEqual(
      ['seller-a', 'ngo-a', 'ngo-b'],
    )
  })

  it('routes sellers to the donation flow', () => {
    expect(rolePaths.seller).toBe('/doar')
  })

  it('offers operation and analytics entry points for the same NGO', () => {
    const entries = buildSessionEntries([
      {
        demoKey: 'ngo-prato-solidario',
        displayName: 'Prato Solidário',
        role: 'ngo',
      },
    ])

    expect(
      entries.map(({ entryPoint, defaultPath }) => [entryPoint, defaultPath]),
    ).toEqual([
      ['ngo-operations', '/ong/ofertas'],
      ['ngo-analytics', '/ong/painel'],
    ])
  })
})
