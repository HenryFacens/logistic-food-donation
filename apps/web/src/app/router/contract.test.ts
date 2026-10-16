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
    expect(defaultPathForRole('partner')).toBe('/parceiro')
    expect(defaultPathForRole(null)).toBe('/entrar')
  })

  it('keeps role guards in the route contract', () => {
    const donationRoute = routeByPath('/doar')
    const adminRoute = routeByPath('/admin/queues')

    expect(donationRoute).toBeDefined()
    expect(adminRoute).toBeDefined()
    expect(canAccessRoute(donationRoute!, 'seller')).toBe(true)
    expect(canAccessRoute(donationRoute!, 'ngo')).toBe(false)
    expect(canAccessRoute(adminRoute!, 'partner')).toBe(true)
    expect(canAccessRoute(adminRoute!, null)).toBe(false)
  })

  it('filters navigation by role and shell', () => {
    expect(
      navigationForRole('seller', 'mobile').map((route) => route.path),
    ).toEqual(['/doar', '/minhas-doacoes'])
    expect(
      navigationForRole('seller', 'desktop').map((route) => route.path),
    ).toEqual(['/painel', '/admin/queues'])
  })
})

