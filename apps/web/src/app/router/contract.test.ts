import { describe, expect, it } from 'vitest'
import {
  canAccessRoute,
  defaultPathForRole,
  navigationForRole,
  routeByPath,
} from './contract'

describe('router contract', () => {
  it('selects the documented default route for each role', () => {
    expect(defaultPathForRole('seller')).toBe('/doar')
    expect(defaultPathForRole('ngo')).toBe('/ong/ofertas')
    expect(defaultPathForRole('driver')).toBe('/coleta')
    expect(defaultPathForRole('partner')).toBe('/patrocinador')
    expect(defaultPathForRole('platform')).toBe('/plataforma')
    expect(defaultPathForRole(null)).toBe('/entrar')
  })

  it('keeps role guards in the route contract', () => {
    const donationRoute = routeByPath('/doar')
    const adminRoute = routeByPath('/admin/queues')
    const communityRoute = routeByPath('/hoje')

    expect(donationRoute).toBeDefined()
    expect(adminRoute).toBeDefined()
    expect(canAccessRoute(donationRoute!, 'seller')).toBe(true)
    expect(canAccessRoute(donationRoute!, 'ngo')).toBe(false)
    expect(canAccessRoute(adminRoute!, 'partner')).toBe(false)
    expect(canAccessRoute(adminRoute!, 'platform')).toBe(true)
    expect(canAccessRoute(adminRoute!, null)).toBe(false)
    expect(canAccessRoute(communityRoute!, null)).toBe(true)
  })

  it('filters navigation by role and shell', () => {
    expect(
      navigationForRole('seller', 'mobile').map((route) => route.path),
    ).toEqual(['/doar', '/minhas-doacoes', '/metricas'])
    expect(
      navigationForRole('seller', 'desktop').map((route) => route.path),
    ).toEqual([])
    expect(
      navigationForRole('platform', 'desktop').map((route) => route.path),
    ).toEqual(['/plataforma', '/admin/queues'])
    expect(
      navigationForRole('driver', 'mobile').map((route) => route.path),
    ).toEqual(['/coleta', '/cupons', '/motorista/metricas'])
  })

  it('keeps the old driver dashboard path as a non-navigable alias', () => {
    const canonicalRoute = routeByPath('/motorista/metricas')
    const legacyRoute = routeByPath('/motorista/painel')

    expect(canonicalRoute).toMatchObject({
      id: 'driver-dashboard',
      navigation: true,
    })
    expect(legacyRoute).toMatchObject({
      id: 'driver-dashboard',
      navigation: false,
    })
  })
})
