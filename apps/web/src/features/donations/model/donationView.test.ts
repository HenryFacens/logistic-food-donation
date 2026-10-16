import { describe, expect, it } from 'vitest'
import { donationStatusView, eventLabel } from './donationView'

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
})
