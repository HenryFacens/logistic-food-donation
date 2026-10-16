import { describe, expect, it } from 'vitest'
import { mapOfferDecision } from './viewModels'

describe('mapOfferDecision', () => {
  it('allows a pending decision before expiration', () => {
    expect(
      mapOfferDecision(
        { expiresAt: '2026-10-16T15:00:00-03:00', status: 'pending' },
        new Date('2026-10-16T14:30:00-03:00'),
      ),
    ).toMatchObject({
      canDecide: true,
      expired: false,
      statusLabel: 'Aguardando decisão',
    })
  })

  it('blocks a pending decision after expiration', () => {
    expect(
      mapOfferDecision(
        { expiresAt: '2026-10-16T15:00:00-03:00', status: 'pending' },
        new Date('2026-10-16T15:00:01-03:00'),
      ),
    ).toMatchObject({
      canDecide: false,
      expired: true,
      statusLabel: 'Prazo encerrado',
    })
  })
})
