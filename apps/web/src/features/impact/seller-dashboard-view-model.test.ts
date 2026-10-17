import type { DashboardSection } from '@resgata/shared'
import { describe, expect, it } from 'vitest'
import {
  buildSellerCompletionDonut,
  buildSellerDonationFunnel,
  buildSellerMonthlyTrend,
  selectSellerEssentialMetrics,
} from './seller-dashboard-view-model'

const sections: DashboardSection[] = [
  {
    key: 'fiscal',
    title: 'Fiscal',
    metrics: [
      {
        evidence: 'unavailable',
        key: 'avoidedDisposalCost',
        label: 'Custo evitado',
        unit: 'BRL',
        value: null,
      },
      {
        evidence: 'recorded',
        key: 'receiptCount',
        label: 'Comprovantes',
        unit: 'comprovantes',
        value: 8,
      },
      {
        evidence: 'calculated',
        key: 'grossDonationValue',
        label: 'Valor contábil',
        unit: 'BRL',
        value: 420,
      },
    ],
    monthlySeries: [],
  },
  {
    key: 'donations',
    title: 'Doações',
    metrics: [
      {
        evidence: 'recorded',
        key: 'receivedWeightKg',
        label: 'Recebida',
        unit: 'kg',
        value: 80,
      },
      {
        evidence: 'calculated',
        key: 'completionRate',
        label: 'Concluída',
        unit: '%',
        value: 80,
      },
      {
        evidence: 'calculated',
        key: 'publishedWeightKg',
        label: 'Publicada',
        unit: 'kg',
        value: 100,
      },
      {
        evidence: 'calculated',
        key: 'collectedWeightKg',
        label: 'Coletada',
        unit: 'kg',
        value: 90,
      },
      {
        evidence: 'calculated',
        key: 'qualityRejectionRate',
        label: 'Rejeitada',
        unit: '%',
        value: 5,
      },
      {
        evidence: 'calculated',
        key: 'averagePublicationToCollection',
        label: 'Tempo até coleta',
        unit: 'min',
        value: 12,
      },
      {
        evidence: 'calculated',
        key: 'collectedBeforeExpirationRate',
        label: 'Antes do vencimento',
        unit: '%',
        value: 97,
      },
    ],
    monthlySeries: [],
  },
]

describe('seller dashboard view model', () => {
  it('builds the donation funnel by key instead of response order', () => {
    expect(buildSellerDonationFunnel(sections).map((item) => item.value))
      .toEqual([100, 90, 80])
  })

  it('derives the remaining completion slice from the recorded percentage', () => {
    expect(buildSellerCompletionDonut(sections)).toEqual([
      { label: 'Concluída', tone: 'success', value: 80 },
      { label: 'Ainda não concluída', tone: 'muted', value: 20 },
    ])
  })

  it('drops null monthly points instead of displaying them as zero', () => {
    expect(
      buildSellerMonthlyTrend({
        evidence: 'calculated',
        key: 'publishedKgByMonth',
        label: 'Kg publicados',
        points: [
          { month: '2026-08', value: 120 },
          { month: '2026-09', value: null },
        ],
        unit: 'kg',
      }),
    ).toMatchObject([{ value: 120 }])
  })

  it('keeps only the essential cards and preserves unavailable evidence', () => {
    const selected = selectSellerEssentialMetrics(sections)

    expect(selected.map((metric) => metric.key)).toEqual([
      'averagePublicationToCollection',
      'collectedBeforeExpirationRate',
      'qualityRejectionRate',
      'grossDonationValue',
      'receiptCount',
      'avoidedDisposalCost',
    ])
    expect(selected.at(-1)).toMatchObject({
      evidence: 'unavailable',
      value: null,
    })
  })
})
