import { describe, expect, it } from 'vitest'
import {
  mapPickupConfirmation,
  nextPickupAction,
} from './viewModels'

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
})
