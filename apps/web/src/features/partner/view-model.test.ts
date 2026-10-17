import { describe, expect, it } from 'vitest'
import {
  formatPartnerMetric,
  formatRoi,
  buildRedemptionFunnel,
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
      cancelled: 0,
      conversionLabel: '0%',
      drivers: 0,
      issued: 0,
      total: 0,
      used: 0,
    })

    expect(
      summarizeRedemptions([
        {
          driverId: 'driver-a',
          issuedAt: '2026-01-01T00:00:00Z',
          status: 'used',
        },
        {
          driverId: 'driver-a',
          issuedAt: '2026-01-02T00:00:00Z',
          status: 'issued',
        },
      ]),
    ).toEqual({
      cancelled: 0,
      conversionLabel: '50%',
      drivers: 1,
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

  it('builds funnel widths from the real redemption list', () => {
    const funnel = buildRedemptionFunnel([
      { issuedAt: '2026-01-01T00:00:00Z', status: 'used' },
      { issuedAt: '2026-01-02T00:00:00Z', status: 'issued' },
      { issuedAt: '2026-01-03T00:00:00Z', status: 'cancelled' },
    ])

    expect(funnel.map(({ key, label, value }) => ({ key, label, value }))).toEqual([
      { key: 'issued-total', label: 'Emitidos', value: 3 },
      { key: 'used', label: 'Usados em compra', value: 1 },
      { key: 'waiting', label: 'Aguardando uso', value: 1 },
      { key: 'cancelled', label: 'Cancelados', value: 1 },
    ])
    expect(funnel[0]?.width).toBe(100)
    expect(funnel[1]?.width).toBeCloseTo(100 / 3)
    expect(funnel[2]?.width).toBeCloseTo(100 / 3)
    expect(funnel[3]?.width).toBeCloseTo(100 / 3)
  })
})
