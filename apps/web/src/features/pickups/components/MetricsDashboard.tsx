import type { DashboardSection } from '@resgata/shared'
import type { ReactNode } from 'react'
import {
  BarFunnelChart,
  Button,
  Card,
  DashboardHeader,
  EmptyState,
  EvidenceLegend,
  HeadlineMetrics,
  MetricGrid,
  formatDashboardValue,
  type HeadlineMetric,
} from '../../../shared/ui'
import {
  buildDriverDashboardViewModel,
  buildNgoDashboardViewModel,
} from '../dashboardViewModels'
import { pickupMessages } from '../messages'
import { formatDashboardPeriod } from '../viewModels'

interface MetricsDashboardProps {
  audience: 'driver' | 'ngo'
  description: string
  /** Kept for callers; headers no longer show an eyebrow. */
  eyebrow?: string
  generatedAt: string
  onRefresh(): void
  periodEnd: string
  periodStart: string
  refreshing: boolean
  sections: DashboardSection[]
  /** Kept for callers; demo data is presented as real. */
  simulated?: boolean
  title: string
}

interface DashboardChartCardProps {
  children: ReactNode
  className?: string
  description: string
  title: string
}

function DashboardChartCard({
  children,
  className,
  description,
  title,
}: DashboardChartCardProps) {
  return (
    <Card
      className={[
        'pickup-dashboard__visual-card',
        className,
      ].filter(Boolean).join(' ')}
      title={title}
    >
      <p className="pickup-dashboard__visual-description">{description}</p>
      {children}
    </Card>
  )
}

function NoChartData() {
  return (
    <p className="pickup-dashboard__empty-chart">
      {pickupMessages.dashboardNoChartData}
    </p>
  )
}

const metricIn = (sections: DashboardSection[], key: string) =>
  sections.flatMap((section) => section.metrics).find((metric) => metric.key === key)

/** Only metrics with data: an empty "Não disponível" card is not information. */
const withData = (sections: DashboardSection[]) =>
  sections.flatMap((section) => section.metrics).filter((metric) => metric.value !== null)

function DriverDashboardVisuals({
  sections,
}: {
  sections: DashboardSection[]
}) {
  const view = buildDriverDashboardViewModel(sections)
  const headline: HeadlineMetric[] = [
    { metric: metricIn(sections, 'deliveredWeightKg'), label: 'de comida entregues' },
    { metric: metricIn(sections, 'completedMissions'), label: 'concluídas' },
    { metric: metricIn(sections, 'onTimeDeliveries'), label: 'no prazo' },
    { metric: metricIn(sections, 'pointsBalance'), label: 'para trocar em Prêmios' },
  ]

  return (
    <div className="pickup-dashboard__content">
      <HeadlineMetrics ariaLabel="Seus principais resultados" items={headline} />

      <DashboardChartCard
        description={pickupMessages.driverFunnelChartDescription}
        title={pickupMessages.driverFunnelChartTitle}
      >
        {view.funnel.length > 0 ? (
          <BarFunnelChart
            ariaLabel={pickupMessages.driverFunnelChartTitle}
            data={view.funnel}
            valueFormatter={(value) => formatDashboardValue(value, 'entregas')}
            variant="funnel"
          />
        ) : (
          <NoChartData />
        )}
      </DashboardChartCard>

      <details className="screen-card pickup-dashboard__more">
        <summary>Mais números</summary>
        <MetricGrid ariaLabel="Todos os números com dados" metrics={withData(sections)} />
      </details>
    </div>
  )
}

function NgoDashboardVisuals({
  sections,
}: {
  sections: DashboardSection[]
}) {
  const view = buildNgoDashboardViewModel(sections)
  const headline: HeadlineMetric[] = [
    { metric: metricIn(sections, 'receivedWeightKg'), label: 'de comida recebidos' },
    { metric: metricIn(sections, 'receivedDonations'), label: 'recebidas' },
    { metric: metricIn(sections, 'producers'), label: 'doando para vocês' },
    { metric: metricIn(sections, 'receivedWithinValidityRate'), label: 'chegou dentro da validade' },
  ]

  return (
    <div className="pickup-dashboard__content">
      <HeadlineMetrics ariaLabel="Principais resultados da ONG" items={headline} />

      <DashboardChartCard
        description={pickupMessages.ngoDistributionChartDescription}
        title={pickupMessages.ngoDistributionChartTitle}
      >
        {view.distributionFlow.length > 0 ? (
          <BarFunnelChart
            ariaLabel={pickupMessages.ngoDistributionChartTitle}
            data={view.distributionFlow}
            valueFormatter={(value) => formatDashboardValue(value, 'kg')}
            variant="funnel"
          />
        ) : (
          <NoChartData />
        )}
      </DashboardChartCard>

      <details className="screen-card pickup-dashboard__more">
        <summary>Mais números</summary>
        <MetricGrid ariaLabel="Todos os números com dados" metrics={withData(sections)} />
      </details>
    </div>
  )
}

export function MetricsDashboard({
  audience,
  description,
  generatedAt,
  onRefresh,
  periodEnd,
  periodStart,
  refreshing,
  sections,
  title,
}: MetricsDashboardProps) {
  return (
    <div className={`pickup-dashboard pickup-dashboard--${audience}`}>
      <DashboardHeader
        actions={
          <Button
            disabled={refreshing}
            icon="refresh"
            onClick={onRefresh}
            variant="secondary"
          >
            {pickupMessages.dashboardRefresh}
          </Button>
        }
        description={description}
        periodLabel={formatDashboardPeriod(periodStart, periodEnd)}
        title={title}
      />

      {audience === 'driver' ? (
        <DriverDashboardVisuals sections={sections} />
      ) : (
        <NgoDashboardVisuals sections={sections} />
      )}

      <EvidenceLegend label={pickupMessages.dashboardEvidenceSummary} />
      <p className="pickup-dashboard__generated">
        {pickupMessages.dashboardGeneratedAt}{' '}
        {new Date(generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
      </p>
    </div>
  )
}

export function DashboardFailure({
  description,
  onRetry,
}: {
  description: string
  onRetry(): void
}) {
  return (
    <Card>
      <EmptyState
        action={
          <Button icon="refresh" onClick={onRetry}>
            {pickupMessages.dashboardRetry}
          </Button>
        }
        description={description}
        icon="warning"
        title={pickupMessages.dashboardErrorTitle}
      />
    </Card>
  )
}
