import type { DashboardMetric, DashboardSection } from '@resgata/shared'
import { describe, expect, it } from 'vitest'
import {
  buildDriverDashboardViewModel,
  buildNgoDashboardViewModel,
} from './dashboardViewModels'

const metric = (
  key: string,
  value: number | null,
  unit = 'contagem',
): DashboardMetric => ({
  evidence: value === null ? 'unavailable' : 'calculated',
  key,
  label: key,
  unit,
  value,
})

const section = (
  key: string,
  metrics: DashboardMetric[],
): DashboardSection => ({
  key,
  metrics,
  monthlySeries: [],
  title: key,
})

describe('pickup dashboard view models', () => {
  it('converts driver acceptance seconds to minutes and omits null chart points', () => {
    const view = buildDriverDashboardViewModel([
      section('operations', [
        metric('availableMissions', 6, 'missões'),
        metric('acceptedMissions', 40, 'missões'),
        metric('completedMissions', 38, 'missões'),
        metric('cancelledMissions', 2, 'missões'),
        metric('averageAcceptanceTime', 90, 's'),
        metric('averageCollectionTime', null, 'min'),
        metric('averageDeliveryTime', 22, 'min'),
      ]),
      section('reputation', []),
      section('rewards', []),
    ])

    expect(view.funnel.map((datum) => datum.value)).toEqual([6, 40, 38])
    expect(view.completionStatus.map((datum) => datum.value)).toEqual([38, 2])
    expect(view.timesInMinutes).toEqual([
      expect.objectContaining({ label: 'Aceitar', value: 1.5 }),
      expect.objectContaining({ label: 'Entregar', value: 22 }),
    ])
  })

  it('keeps unavailable NGO distribution out of charts and visible as a gap', () => {
    const unavailableDistribution = metric(
      'communityDistributedWeight',
      null,
      'kg',
    )
    const view = buildNgoDashboardViewModel([
      section('receiving', [
        metric('acceptedDeliveryRate', 75, '%'),
        metric('allGoodReceipts', 7, 'recebimentos'),
        metric('partialReceipts', 2, 'recebimentos'),
        metric('rejectedReceipts', 1, 'recebimentos'),
      ]),
      section('logistics', [
        metric('usedCapacityRate', 60, '%'),
        metric('idleCapacityRate', 40, '%'),
      ]),
      section('communityDistribution', [
        metric('ngoReceivedWeight', 180, 'kg'),
        unavailableDistribution,
      ]),
      section('socialEffectiveness', []),
    ])

    expect(view.distributionFlow).toEqual([
      expect.objectContaining({ value: 180 }),
    ])
    expect(view.gapMetrics).toContain(unavailableDistribution)
    expect(view.receiptConfirmationStatus.map((datum) => datum.value)).toEqual([
      75,
      25,
    ])
  })
})
