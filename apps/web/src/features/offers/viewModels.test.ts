import { describe, expect, it } from 'vitest'
import {
  mapOfferDecision,
  offerResponseWindow,
  offerTitle,
} from './viewModels'

describe('mapOfferDecision', () => {
  it('removes repeated simulation markers from the offer title', () => {
    expect(
      offerTitle({
        donation: {
          description: 'SIMULADO - 12 caixas de tomate',
        },
        donationId: '12345678-0000-0000-0000-000000000000',
      } as never),
    ).toBe('12 caixas de tomate')
  })

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

  it('formats the remaining response window without inventing an ETA', () => {
    expect(
      offerResponseWindow(
        { expiresAt: '2026-10-16T15:10:00-03:00', status: 'pending' },
        new Date('2026-10-16T14:30:00-03:00'),
      ),
    ).toBe('Responder em 40 min')
  })
})
