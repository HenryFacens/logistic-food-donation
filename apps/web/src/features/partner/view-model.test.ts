import { describe, expect, it } from 'vitest'
import {
  formatPartnerMetric,
  formatRoi,
  redemptionStatusLabels,
  summarizeRedemptions,
} from './view-model'

describe('partner view model', () => {
  it('formats monetary metrics and social ROI', () => {
    expect(formatPartnerMetric(1250.5, 'BRL')).toContain('1.250,50')
    expect(formatRoi(2.75)).toBe('2,75 pessoas/R$')
  })

  it('summarizes coupon conversion without dividing by zero', () => {
    expect(summarizeRedemptions([])).toEqual({
      conversionLabel: '0%',
      issued: 0,
      total: 0,
      used: 0,
    })

    expect(
      summarizeRedemptions([
        { issuedAt: '2026-01-01T00:00:00Z', status: 'used' },
        { issuedAt: '2026-01-02T00:00:00Z', status: 'issued' },
      ]),
    ).toEqual({
      conversionLabel: '50%',
      issued: 1,
      total: 2,
      used: 1,
    })
  })

  it('keeps explicit pt-BR status labels', () => {
    expect(redemptionStatusLabels).toEqual({
      cancelled: 'Cancelado',
      issued: 'Emitido',
      used: 'Utilizado',
    })
  })
})

