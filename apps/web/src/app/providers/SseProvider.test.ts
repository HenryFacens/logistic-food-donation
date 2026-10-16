import { describe, expect, it } from 'vitest'
import { queryScopesForEvent } from './SseProvider'

describe('queryScopesForEvent', () => {
  it('invalidates offer consumers for offer events', () => {
    expect(queryScopesForEvent({ eventType: 'offer.sent' })).toEqual([
      'donations',
      'impact',
      'admin',
      'offers',
    ])
  })

  it('invalidates pickup consumers for collection events', () => {
    expect(queryScopesForEvent({ eventType: 'pickup.collected' })).toEqual([
      'donations',
      'impact',
      'admin',
      'pickups',
    ])
  })
})

