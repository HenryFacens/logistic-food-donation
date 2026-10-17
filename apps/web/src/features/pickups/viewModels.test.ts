import { describe, expect, it } from 'vitest'
import {
  formatDashboardPeriod,
  mapPickupConfirmation,
  nextPickupAction,
  pickupProgress,
  receiptWeightDefaults,
} from './viewModels'
import { pickupQueryKeys } from './queryKeys'

const pickup = {
  deliveryLocation: { latitude: -22.9, longitude: -47.06 },
  pickupLocation: { latitude: -22.89, longitude: -47.05 },
}

describe('pickup confirmation mapping', () => {
  it('normalizes the code and uses browser coordinates', () => {
    expect(
      mapPickupConfirmation({
        action: 'collect',
        code: '12-34 56 extra',
        currentLocation: { latitude: -22.8, longitude: -47.1 },
        pickup,
      }),
    ).toEqual({
      code: '123456',
      location: { latitude: -22.8, longitude: -47.1 },
    })
  })

  it('falls back to the action target when GPS is unavailable', () => {
    expect(
      mapPickupConfirmation({
        action: 'deliver',
        code: '654321',
        currentLocation: null,
        pickup,
      }),
    ).toEqual({
      code: '654321',
      location: pickup.deliveryLocation,
    })
  })

  it('maps pickup states to the next allowed field action', () => {
    expect(nextPickupAction({ driverId: null, status: 'awaiting_driver' })).toBe('assign')
    expect(nextPickupAction({ driverId: 'driver', status: 'assigned' })).toBe('collect')
    expect(nextPickupAction({ driverId: 'driver', status: 'collected' })).toBe('deliver')
    expect(nextPickupAction({ driverId: 'driver', status: 'delivered' })).toBeNull()
  })

  it('maps delivery progress without deriving distance or ETA', () => {
    expect(pickupProgress('en_route_delivery')).toEqual([
      { key: 'assigned', label: 'Atribuída', complete: true, current: false },
      { key: 'pickup', label: 'Retirada', complete: true, current: false },
      { key: 'delivery', label: 'Entrega', complete: false, current: true },
    ])
  })

  it('prefills receipt weights from the pickup estimate', () => {
    expect(receiptWeightDefaults('all_good', 180)).toEqual({
      receivedWeightKg: 180,
      rejectedWeightKg: 0,
    })
    expect(receiptWeightDefaults('partial', 180)).toEqual({
      receivedWeightKg: 162,
      rejectedWeightKg: 18,
    })
    expect(receiptWeightDefaults('rejected', 180)).toEqual({
      receivedWeightKg: 0,
      rejectedWeightKg: 180,
    })
  })

  it('keeps dashboard keys under the pickup feature root', () => {
    expect(pickupQueryKeys.dashboard('driver')).toEqual([
      'pickups',
      'dashboard',
      'driver',
    ])
    expect(pickupQueryKeys.dashboard('ngo')).toEqual([
      'pickups',
      'dashboard',
      'ngo',
    ])
  })

  it('formats dashboard periods in pt-BR', () => {
    expect(
      formatDashboardPeriod(
        '2026-08-01T00:00:00.000Z',
        '2026-10-17T00:00:00.000Z',
      ),
    ).toContain('2026')
  })
})
