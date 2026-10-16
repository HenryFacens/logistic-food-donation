import { describe, expect, it } from 'vitest'
import {
  buildCategoryRows,
  buildImpactCards,
  formatDateRange,
  formatMetricValue,
} from './view-model'

describe('impact view model', () => {
  it('formats integer and decimal metrics in pt-BR', () => {
    expect(formatMetricValue(12, 'doações')).toBe('12 doações')
    expect(formatMetricValue(12.5, 'kg')).toBe('12,5 kg')
  })

  it('sorts category bars and scales them from the largest weight', () => {
    const rows = buildCategoryRows([
      { category: 'bakery', donations: 2, weightKg: 10 },
      { category: 'produce', donations: 1, weightKg: 25 },
    ])

    expect(rows.map(({ category }) => category)).toEqual(['produce', 'bakery'])
    expect(rows[0]).toMatchObject({
      label: 'Hortifrúti',
      percentage: 100,
      weightLabel: '25 kg',
    })
    expect(rows[1]?.percentage).toBe(40)
  })

  it('adds formatted values to cards and formats the reporting period', () => {
    expect(
      buildImpactCards([
        { key: 'weight', label: 'Peso', unit: 'kg', value: 8.25 },
      ])[0]?.formattedValue,
    ).toBe('8,3 kg')
    expect(
      formatDateRange(
        '2026-01-01T00:00:00.000Z',
        '2026-01-31T00:00:00.000Z',
      ),
    ).toContain('2026')
  })
})

