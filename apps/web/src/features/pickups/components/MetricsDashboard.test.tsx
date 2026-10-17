import type { DashboardMetric, DashboardSection } from '@resgata/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MetricsDashboard } from './MetricsDashboard'

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

const commonProps = {
  description: 'Descrição do painel',
  eyebrow: 'Perfil',
  generatedAt: '2026-10-17T12:00:00.000Z',
  onRefresh: () => undefined,
  periodEnd: '2026-10-17T00:00:00.000Z',
  periodStart: '2026-09-17T00:00:00.000Z',
  refreshing: false,
  simulated: true,
  title: 'Métricas',
}

describe('MetricsDashboard', () => {
  it('renders the driver dashboard as charts without simulation labels', () => {
    const markup = renderToStaticMarkup(
      <MetricsDashboard
        {...commonProps}
        audience="driver"
        sections={[
          section('operations', [
            metric('availableMissions', 6, 'missões'),
            metric('acceptedMissions', 40, 'missões'),
            metric('completedMissions', 38, 'missões'),
            metric('cancelledMissions', 2, 'missões'),
            metric('completionRate', 95, '%'),
            metric('averageAcceptanceTime', 90, 's'),
            metric('averageCollectionTime', 14, 'min'),
            metric('averageDeliveryTime', 22, 'min'),
            metric('transportedWeightKg', 4210, 'kg'),
            metric('deliveredWeightKg', 4100, 'kg'),
          ]),
          section('reputation', [
            metric('ngoRating', 4.8, 'nota'),
            metric('sellerRating', 4.6, 'nota'),
            metric('geolocationConfirmationRate', 96, '%'),
          ]),
          section('rewards', [
            metric('pointsBalance', 1380, 'pontos'),
          ]),
        ]}
      />,
    )

    expect(markup).toContain('Da oportunidade à entrega')
    expect(markup).toContain('dashboard-line-chart__curve')
    expect(markup).toContain('Carga transportada e entregue')
    expect(markup).toContain('O tempo de aceite')
    expect(markup).not.toContain('SIMULADO')
  })

  it('renders NGO receipt charts without inventing unavailable distribution', () => {
    const markup = renderToStaticMarkup(
      <MetricsDashboard
        {...commonProps}
        audience="ngo"
        sections={[
          section('receiving', [
            metric('acceptedDeliveryRate', 90, '%'),
            metric('allGoodReceipts', 8, 'recebimentos'),
            metric('partialReceipts', 1, 'recebimentos'),
            metric('rejectedReceipts', 1, 'recebimentos'),
          ]),
          section('logistics', [
            metric('usedCapacityRate', 72, '%'),
            metric('idleCapacityRate', 28, '%'),
          ]),
          section('communityDistribution', [
            metric('ngoReceivedWeight', 1052, 'kg'),
            metric('communityDistributedWeight', null, 'kg'),
          ]),
          section('socialEffectiveness', []),
        ]}
      />,
    )

    expect(markup).toContain('Condição dos alimentos')
    expect(markup).toContain('Ocupação da capacidade')
    expect(markup).toContain('Recebidos pela ONG')
    expect(markup).not.toContain('Distribuídos à comunidade</span>')
    expect(markup).toContain('Não disponível')
  })
})
