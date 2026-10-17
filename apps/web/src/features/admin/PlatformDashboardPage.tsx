import {
  AppIcon,
  AppLink,
  BarFunnelChart,
  Button,
  Card,
  DashboardHeader,
  DonutChart,
  EmptyState,
  EvidenceLegend,
  LoadingState,
  MetricGrid,
  SimuladoBadge,
  StatusBadge,
  formatDashboardValue,
} from '../../shared/ui'
import { adminMessages } from './messages'
import {
  buildPlatformQualityBars,
  buildPlatformRateDonut,
  buildPlatformStageFunnel,
  buildPlatformUserBars,
  findPlatformMetric,
  selectPlatformEssentialMetrics,
} from './platform-dashboard-view-model'
import { usePlatformDashboardQuery } from './queries'
import {
  collectPlatformEvidence,
  formatPlatformDashboardPeriod,
} from './view-model'
import './admin.css'

export function PlatformDashboardPage() {
  const dashboard = usePlatformDashboardQuery()

  if (dashboard.isPending) {
    return (
      <LoadingState label={adminMessages.platformDashboard.loading} />
    )
  }

  if (dashboard.isError) {
    return (
      <Card className="platform-dashboard__failure">
        <EmptyState
          action={
            <Button
              icon="refresh"
              onClick={() => void dashboard.refetch()}
            >
              Tentar novamente
            </Button>
          }
          description={dashboard.error.message}
          icon="warning"
          title={adminMessages.platformDashboard.errorTitle}
        />
      </Card>
    )
  }

  const periodLabel = formatPlatformDashboardPeriod(
    dashboard.data.periodStart,
    dashboard.data.periodEnd,
  )
  const evidence = collectPlatformEvidence(dashboard.data.sections)
  const sections = dashboard.data.sections
  const operationFunnel = buildPlatformStageFunnel(sections)
  const matchingMetric = findPlatformMetric(
    sections,
    'operation',
    'matchingRate',
  )
  const deliveryMetric = findPlatformMetric(
    sections,
    'operation',
    'deliveryCompletionRate',
  )
  const matchingDonut = buildPlatformRateDonut(
    matchingMetric,
    adminMessages.platformDashboard.charts.matchingSuccess,
  )
  const deliveryDonut = buildPlatformRateDonut(
    deliveryMetric,
    adminMessages.platformDashboard.charts.deliverySuccess,
  )
  const userBars = buildPlatformUserBars(sections)
  const qualityBars = buildPlatformQualityBars(sections)
  const essentialMetrics = selectPlatformEssentialMetrics(sections)

  return (
    <div className="platform-dashboard">
      <DashboardHeader
        actions={
          <AppLink
            className="platform-dashboard__queues-link"
            href="/admin/queues"
          >
            <AppIcon name="admin" size={20} />
            <span>{adminMessages.platformDashboard.queuesCta}</span>
          </AppLink>
        }
        description={adminMessages.platformDashboard.subtitle}
        eyebrow={adminMessages.platformDashboard.eyebrow}
        periodLabel={periodLabel}
        status={
          dashboard.data.simulated ? (
            <SimuladoBadge />
          ) : (
            <StatusBadge label="Evidência por indicador" tone="neutral" />
          )
        }
        title={adminMessages.platformDashboard.title}
      />

      <Card className="platform-dashboard__operational-note">
        <AppIcon name="chart" size={24} />
        <p>{adminMessages.platformDashboard.operationalNote}</p>
      </Card>

      <section
        aria-labelledby="platform-operation-title"
        className="platform-dashboard__overview"
      >
        <Card className="platform-chart-card platform-chart-card--flow">
          <div className="platform-chart-card__heading">
            <div>
              <span>{adminMessages.platformDashboard.charts.flowEyebrow}</span>
              <h2 id="platform-operation-title">
                {adminMessages.platformDashboard.charts.flowTitle}
              </h2>
            </div>
            <p>{adminMessages.platformDashboard.charts.flowDescription}</p>
          </div>
          {operationFunnel.length > 0 ? (
            <BarFunnelChart
              ariaLabel={
                adminMessages.platformDashboard.charts.flowAriaLabel
              }
              data={operationFunnel}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'ofertas')
              }
              variant="funnel"
            />
          ) : (
            <p className="platform-chart-empty">
              {adminMessages.platformDashboard.charts.unavailable}
            </p>
          )}
          <small>{adminMessages.platformDashboard.charts.flowMethod}</small>
        </Card>

        <div className="platform-dashboard__rate-grid">
          <Card className="platform-chart-card">
            <h2>{adminMessages.platformDashboard.charts.matchingTitle}</h2>
            {matchingDonut.length > 0 ? (
              <DonutChart
                ariaLabel={
                  adminMessages.platformDashboard.charts.matchingAriaLabel
                }
                centerLabel={
                  adminMessages.platformDashboard.charts.matchingCenterLabel
                }
                centerValue={
                  matchingMetric?.value === null ||
                  matchingMetric?.value === undefined
                    ? undefined
                    : formatDashboardValue(
                        matchingMetric.value,
                        matchingMetric.unit,
                      )
                }
                data={matchingDonut}
                valueFormatter={(value) =>
                  formatDashboardValue(value, '%')
                }
              />
            ) : (
              <p className="platform-chart-empty">
                {adminMessages.platformDashboard.charts.unavailable}
              </p>
            )}
          </Card>

          <Card className="platform-chart-card">
            <h2>{adminMessages.platformDashboard.charts.deliveryTitle}</h2>
            {deliveryDonut.length > 0 ? (
              <DonutChart
                ariaLabel={
                  adminMessages.platformDashboard.charts.deliveryAriaLabel
                }
                centerLabel={
                  adminMessages.platformDashboard.charts.deliveryCenterLabel
                }
                centerValue={
                  deliveryMetric?.value === null ||
                  deliveryMetric?.value === undefined
                    ? undefined
                    : formatDashboardValue(
                        deliveryMetric.value,
                        deliveryMetric.unit,
                      )
                }
                data={deliveryDonut}
                valueFormatter={(value) =>
                  formatDashboardValue(value, '%')
                }
              />
            ) : (
              <p className="platform-chart-empty">
                {adminMessages.platformDashboard.charts.unavailable}
              </p>
            )}
          </Card>
        </div>
      </section>

      <section
        aria-label={adminMessages.platformDashboard.charts.networkAriaLabel}
        className="platform-dashboard__chart-grid"
      >
        <Card className="platform-chart-card">
          <div className="platform-chart-card__heading">
            <div>
              <span>{adminMessages.platformDashboard.charts.usersEyebrow}</span>
              <h2>{adminMessages.platformDashboard.charts.usersTitle}</h2>
            </div>
            <p>{adminMessages.platformDashboard.charts.usersDescription}</p>
          </div>
          {userBars.length > 0 ? (
            <BarFunnelChart
              ariaLabel={
                adminMessages.platformDashboard.charts.usersAriaLabel
              }
              data={userBars}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'usuários')
              }
            />
          ) : (
            <p className="platform-chart-empty">
              {adminMessages.platformDashboard.charts.unavailable}
            </p>
          )}
        </Card>

        <Card className="platform-chart-card">
          <div className="platform-chart-card__heading">
            <div>
              <span>
                {adminMessages.platformDashboard.charts.qualityEyebrow}
              </span>
              <h2>{adminMessages.platformDashboard.charts.qualityTitle}</h2>
            </div>
            <p>
              {adminMessages.platformDashboard.charts.qualityDescription}
            </p>
          </div>
          {qualityBars.length > 0 ? (
            <BarFunnelChart
              ariaLabel={
                adminMessages.platformDashboard.charts.qualityAriaLabel
              }
              data={qualityBars}
              valueFormatter={(value) =>
                formatDashboardValue(value, 'ocorrências')
              }
            />
          ) : (
            <p className="platform-chart-empty">
              {adminMessages.platformDashboard.charts.unavailable}
            </p>
          )}
        </Card>
      </section>

      <Card className="platform-dashboard__essentials">
        <div className="platform-chart-card__heading">
          <div>
            <span>
              {adminMessages.platformDashboard.essentials.eyebrow}
            </span>
            <h2>{adminMessages.platformDashboard.essentials.title}</h2>
          </div>
          <p>{adminMessages.platformDashboard.essentials.description}</p>
        </div>
        {essentialMetrics.length > 0 ? (
          <MetricGrid
            ariaLabel={
              adminMessages.platformDashboard.essentials.ariaLabel
            }
            metrics={essentialMetrics}
          />
        ) : (
          <p className="platform-chart-empty">
            {adminMessages.platformDashboard.empty}
          </p>
        )}
      </Card>

      <EvidenceLegend
        evidence={evidence}
        label={adminMessages.platformDashboard.evidenceTitle}
      />
    </div>
  )
}
