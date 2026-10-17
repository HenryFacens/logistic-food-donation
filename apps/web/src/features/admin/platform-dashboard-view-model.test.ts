import type { DashboardSection } from '@resgata/shared'
import { describe, expect, it } from 'vitest'
import {
  buildPlatformRateDonut,
  buildPlatformStageFunnel,
  buildPlatformUserBars,
  selectPlatformEssentialMetrics,
} from './platform-dashboard-view-model'

const sections: DashboardSection[] = [
  {
    key: 'operation',
    title: 'Operação',
    metrics: [
      {
        evidence: 'calculated',
        key: 'deliveryCompletionRate',
        label: 'Entrega concluída',
        unit: '%',
        value: 80,
      },
      {
        evidence: 'calculated',
        key: 'acceptedOffers',
        label: 'Aceitas',
        unit: 'ofertas',
        value: 50,
      },
      {
        evidence: 'calculated',
        key: 'publishedOffers',
        label: 'Publicadas',
        unit: 'ofertas',
        value: 100,
      },
      {
        evidence: 'calculated',
        key: 'collectionCompletionRate',
        label: 'Coleta concluída',
        unit: '%',
        value: 90,
      },
      {
        evidence: 'calculated',
        key: 'averageMatchingTime',
        label: 'Tempo de matching',
        unit: 'min',
        value: 4,
      },
    ],
    monthlySeries: [],
  },
  {
    key: 'users',
    title: 'Usuários',
    metrics: [
      {
        evidence: 'calculated',
        key: 'activeNgos',
        label: 'ONGs',
        unit: 'usuários',
        value: 9,
      },
      {
        evidence: 'unavailable',
        key: 'activeDrivers',
        label: 'Transportadores',
        unit: 'usuários',
        value: null,
      },
      {
        evidence: 'calculated',
        key: 'activeSellers',
        label: 'Doadores',
        unit: 'usuários',
        value: 24,
      },
    ],
    monthlySeries: [],
  },
  {
    key: 'volume',
    title: 'Volume',
    metrics: [
      {
        evidence: 'calculated',
        key: 'movedWeightKg',
        label: 'Kg movimentados',
        unit: 'kg',
        value: 900,
      },
      {
        evidence: 'unavailable',
        key: 'rescuedEconomicValue',
        label: 'Valor resgatado',
        unit: 'BRL',
        value: null,
      },
    ],
    monthlySeries: [],
  },
]

describe('platform dashboard view model', () => {
  it('derives collected and received counts from accepted offers and rates', () => {
    expect(buildPlatformStageFunnel(sections).map((item) => item.value))
      .toEqual([100, 50, 45, 40])
  })

  it('does not convert unavailable user metrics into zero bars', () => {
    expect(buildPlatformUserBars(sections).map((item) => item.label))
      .toEqual(['Doadores', 'ONGs'])
  })

  it('creates a complementary donut without exceeding one hundred percent', () => {
    expect(
      buildPlatformRateDonut(
        {
          evidence: 'calculated',
          key: 'matchingRate',
          label: 'Matching',
          unit: '%',
          value: 120,
        },
        'Com matching',
      ),
    ).toEqual([
      { label: 'Com matching', tone: 'success', value: 100 },
      { label: 'Restante', tone: 'muted', value: 0 },
    ])
  })

  it('keeps unavailable essential metrics visible for transparency', () => {
    expect(selectPlatformEssentialMetrics(sections).at(-1)).toMatchObject({
      evidence: 'unavailable',
      key: 'rescuedEconomicValue',
      value: null,
    })
  })
})
