import { describe, expect, it } from 'vitest'
import {
  donationStatusView,
  eventLabel,
  formatRemainingTime,
  nextDonationStepLabel,
} from './donationView'

describe('donation view model', () => {
  it('never represents status with color alone', () => {
    expect(donationStatusView.delivered).toEqual({
      label: 'Entregue',
      tone: 'success',
    })
  })

  it('maps domain events to pt-BR timeline copy', () => {
    expect(eventLabel('donation.created', 'posted')).toBe('Doação publicada')
  })

  it('formats the remaining pickup window without hiding minutes', () => {
    expect(
      formatRemainingTime(
        '2026-10-17T15:52:00.000Z',
        new Date('2026-10-17T14:00:00.000Z'),
      ),
    ).toBe('1h 52min')
  })

  it('describes the next real workflow step from the current status', () => {
    expect(nextDonationStepLabel('accepted')).toBe(
      'Aguardar a retirada pelo coletador',
    )
    expect(nextDonationStepLabel('delivered')).toBeNull()
  })
})
