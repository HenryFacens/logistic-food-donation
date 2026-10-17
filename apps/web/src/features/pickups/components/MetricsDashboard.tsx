import type { DashboardSection } from '@resgata/shared'
import type { ReactNode } from 'react'
import {
  BarFunnelChart,
  Button,
  Card,
  DashboardHeader,
  DonutChart,
  EmptyState,
  EvidenceLegend,
  LineChart,
  MetricGrid,
  SimuladoBadge,
  StatusBadge,
  formatDashboardValue,
} from '../../../shared/ui'
import {
  buildDriverDashboardViewModel,
  buildNgoDashboardViewModel,
} from '../dashboardViewModels'
import {
  pickupDashboardLabels,
  pickupMessages,
} from '../messages'
import { formatDashboardPeriod } from '../viewModels'

interface MetricsDashboardProps {
  audience: 'driver' | 'ngo'
  description: string
  eyebrow: string
  generatedAt: string
  onRefresh(): void
  periodEnd: string
  periodStart: string
  refreshing: boolean
  sections: DashboardSection[]
  simulated: boolean
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

function DriverDashboardVisuals({
  sections,
}: {
  sections: DashboardSection[]
}) {
  const view = buildDriverDashboardViewModel(sections)
  const completionValue = view.completionMetric
    ? formatDashboardValue(
        view.completionMetric.value,
        view.completionMetric.unit,
      )
    : undefined
  const geolocationValue = view.geolocationMetric
    ? formatDashboardValue(
        view.geolocationMetric.value,
        view.geolocationMetric.unit,
      )
    : undefined

  return (
    <div className="pickup-dashboard__content">
      <div className="pickup-dashboard__visual-grid pickup-dashboard__visual-grid--driver">
        <DashboardChartCard
          description={pickupMessages.driverFunnelChartDescription}
          title={pickupMessages.driverFunnelChartTitle}
        >
          {view.funnel.length > 0 ? (
            <BarFunnelChart
              ariaLabel={pickupMessages.driverFunnelChartTitle}
              data={view.funnel}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'missões')
              }
              variant="funnel"
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          description={pickupMessages.driverCompletionChartDescription}
          title={pickupMessages.driverCompletionChartTitle}
        >
          {view.completionStatus.length > 0 ? (
            <DonutChart
              ariaLabel={pickupMessages.driverCompletionChartTitle}
              centerLabel={pickupDashboardLabels.completionCenter}
              centerValue={completionValue}
              data={view.completionStatus}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'missões')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          className="pickup-dashboard__visual-card--wide"
          description={pickupMessages.driverTimesChartDescription}
          title={pickupMessages.driverTimesChartTitle}
        >
          {view.timesInMinutes.length > 0 ? (
            <LineChart
              ariaLabel={pickupMessages.driverTimesChartTitle}
              data={view.timesInMinutes}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'min')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          description={pickupMessages.driverWeightChartDescription}
          title={pickupMessages.driverWeightChartTitle}
        >
          {view.weights.length > 0 ? (
            <BarFunnelChart
              ariaLabel={pickupMessages.driverWeightChartTitle}
              data={view.weights}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'kg')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          description={pickupMessages.driverDeadlineChartDescription}
          title={pickupMessages.driverDeadlineChartTitle}
        >
          {view.deadlineStatus.length > 0 ? (
            <DonutChart
              ariaLabel={pickupMessages.driverDeadlineChartTitle}
              centerLabel={pickupDashboardLabels.totalWithDeadlineCenter}
              centerValue={formatDashboardValue(
                view.deadlineStatus.reduce(
                  (total, datum) => total + datum.value,
                  0,
                ),
                'entregas',
              )}
              data={view.deadlineStatus}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'entregas')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          description={pickupMessages.driverRatingsChartDescription}
          title={pickupMessages.driverRatingsChartTitle}
        >
          {view.ratings.length > 0 ? (
            <BarFunnelChart
              ariaLabel={pickupMessages.driverRatingsChartTitle}
              data={view.ratings}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'nota')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          description={pickupMessages.driverGeolocationChartDescription}
          title={pickupMessages.driverGeolocationChartTitle}
        >
          {view.geolocationStatus.length > 0 ? (
            <DonutChart
              ariaLabel={pickupMessages.driverGeolocationChartTitle}
              centerLabel={pickupDashboardLabels.geolocationCenter}
              centerValue={geolocationValue}
              data={view.geolocationStatus}
              valueFormatter={(value) =>
                formatDashboardValue(value, '%')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>
      </div>

      {view.operationalMetrics.length > 0 ? (
        <section className="pickup-dashboard__metric-section">
          <h2>{pickupMessages.driverOperationsCardsTitle}</h2>
          <MetricGrid
            ariaLabel={pickupMessages.driverOperationsCardsTitle}
            metrics={view.operationalMetrics}
          />
        </section>
      ) : null}

      {view.ratingMetrics.length > 0 ? (
        <section className="pickup-dashboard__metric-section">
          <h2>{pickupMessages.driverReputationCardsTitle}</h2>
          <MetricGrid
            ariaLabel={pickupMessages.driverReputationCardsTitle}
            metrics={view.ratingMetrics}
          />
        </section>
      ) : null}

      {view.rewardMetrics.length > 0 ? (
        <section className="pickup-dashboard__metric-section">
          <h2>{pickupMessages.driverRewardsCardsTitle}</h2>
          <MetricGrid
            ariaLabel={pickupMessages.driverRewardsCardsTitle}
            metrics={view.rewardMetrics}
          />
        </section>
      ) : null}
    </div>
  )
}

function NgoDashboardVisuals({
  sections,
}: {
  sections: DashboardSection[]
}) {
  const view = buildNgoDashboardViewModel(sections)
  const receiptValue = view.receiptConfirmationMetric
    ? formatDashboardValue(
        view.receiptConfirmationMetric.value,
        view.receiptConfirmationMetric.unit,
      )
    : undefined
  const capacityValue = view.capacityMetric
    ? formatDashboardValue(
        view.capacityMetric.value,
        view.capacityMetric.unit,
      )
    : undefined

  return (
    <div className="pickup-dashboard__content">
      <div className="pickup-dashboard__visual-grid pickup-dashboard__visual-grid--ngo">
        <DashboardChartCard
          description={pickupMessages.ngoConditionChartDescription}
          title={pickupMessages.ngoConditionChartTitle}
        >
          {view.conditionStatus.length > 0 ? (
            <DonutChart
              ariaLabel={pickupMessages.ngoConditionChartTitle}
              centerLabel={pickupDashboardLabels.receiptCountCenter}
              centerValue={formatDashboardValue(
                view.conditionStatus.reduce(
                  (total, datum) => total + datum.value,
                  0,
                ),
                'recebimentos',
              )}
              data={view.conditionStatus}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'recebimentos')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          description={pickupMessages.ngoReceiptChartDescription}
          title={pickupMessages.ngoReceiptChartTitle}
        >
          {view.receiptConfirmationStatus.length > 0 ? (
            <DonutChart
              ariaLabel={pickupMessages.ngoReceiptChartTitle}
              centerLabel={pickupDashboardLabels.ngoReceiptCenter}
              centerValue={receiptValue}
              data={view.receiptConfirmationStatus}
              valueFormatter={(value) =>
                formatDashboardValue(value, '%')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          description={pickupMessages.ngoCapacityChartDescription}
          title={pickupMessages.ngoCapacityChartTitle}
        >
          {view.capacityStatus.length > 0 ? (
            <DonutChart
              ariaLabel={pickupMessages.ngoCapacityChartTitle}
              centerLabel={pickupDashboardLabels.ngoCapacityCenter}
              centerValue={capacityValue}
              data={view.capacityStatus}
              valueFormatter={(value) =>
                formatDashboardValue(value, '%')
              }
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          className="pickup-dashboard__visual-card--wide"
          description={pickupMessages.ngoDistributionChartDescription}
          title={pickupMessages.ngoDistributionChartTitle}
        >
          {view.distributionFlow.length > 0 ? (
            <BarFunnelChart
              ariaLabel={pickupMessages.ngoDistributionChartTitle}
              data={view.distributionFlow}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'kg')
              }
              variant="funnel"
            />
          ) : (
            <NoChartData />
          )}
        </DashboardChartCard>
      </div>

      {view.operationalMetrics.length > 0 ? (
        <section className="pickup-dashboard__metric-section">
          <h2>{pickupMessages.ngoOperationsCardsTitle}</h2>
          <MetricGrid
            ariaLabel={pickupMessages.ngoOperationsCardsTitle}
            metrics={view.operationalMetrics}
          />
        </section>
      ) : null}

      {view.gapMetrics.length > 0 ? (
        <section className="pickup-dashboard__metric-section">
          <div className="pickup-dashboard__metric-heading">
            <h2>{pickupMessages.ngoGapCardsTitle}</h2>
            <p>{pickupMessages.ngoGapCardsDescription}</p>
          </div>
          <MetricGrid
            ariaLabel={pickupMessages.ngoGapCardsTitle}
            metrics={view.gapMetrics}
          />
        </section>
      ) : null}
    </div>
  )
}

export function MetricsDashboard({
  audience,
  description,
  eyebrow,
  generatedAt,
  onRefresh,
  periodEnd,
  periodStart,
  refreshing,
  sections,
  simulated,
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
        eyebrow={eyebrow}
        periodLabel={formatDashboardPeriod(periodStart, periodEnd)}
        status={
          simulated ? (
            <SimuladoBadge />
          ) : (
            <StatusBadge
              label={pickupMessages.dashboardOperationalStatus}
              tone="success"
            />
          )
        }
        title={title}
      />

      <details className="pickup-dashboard__evidence">
        <summary>{pickupMessages.dashboardEvidenceSummary}</summary>
        <EvidenceLegend label={pickupMessages.dashboardEvidenceSummary} />
      </details>

      {audience === 'driver' ? (
        <DriverDashboardVisuals sections={sections} />
      ) : (
        <NgoDashboardVisuals sections={sections} />
      )}

      <Card className="pickup-dashboard__generated">
        <span>{pickupMessages.dashboardGeneratedAt}</span>
        <strong>{new Date(generatedAt).toLocaleString('pt-BR')}</strong>
      </Card>
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
