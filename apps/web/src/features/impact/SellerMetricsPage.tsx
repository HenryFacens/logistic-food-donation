import type { CreateDriverRatingRequest } from '@resgata/shared'
import {
  BarFunnelChart,
  Button,
  Card,
  DashboardHeader,
  DonutChart,
  EmptyState,
  EvidenceLegend,
  LineChart,
  LoadingState,
  MetricGrid,
  SimuladoBadge,
  formatDashboardValue,
  useToast,
} from '../../shared/ui'
import { DriverRatingForm } from './DriverRatingForm'
import { sellerMetricsMessages } from './messages'
import {
  createDriverRatingSubmission,
  useDriverRatingOpportunitiesQuery,
  useSellerDashboardQuery,
  useSubmitDriverRatingMutation,
} from './queries'
import {
  buildSellerCompletionDonut,
  buildSellerDonationFunnel,
  buildSellerLoyaltyBars,
  buildSellerMonthlyTrend,
  findSellerMetric,
  findSellerSeries,
  selectSellerEssentialMetrics,
} from './seller-dashboard-view-model'
import { formatDateRange } from './view-model'
import './seller-metrics.css'

export function SellerMetricsPage() {
  const dashboard = useSellerDashboardQuery()
  const opportunities = useDriverRatingOpportunitiesQuery()
  const submitRating = useSubmitDriverRatingMutation()
  const toast = useToast()
  const messages = sellerMetricsMessages

  const handleRatingSubmit = (
    pickupId: string,
    request: CreateDriverRatingRequest,
  ) => {
    submitRating.reset()
    submitRating.mutate(createDriverRatingSubmission(pickupId, request), {
      onSuccess: () => toast.show(messages.ratings.success, 'success'),
    })
  }

  const periodLabel = dashboard.data
    ? formatDateRange(dashboard.data.periodStart, dashboard.data.periodEnd)
    : undefined
  const sections = dashboard.data?.sections ?? []
  const donationFunnel = buildSellerDonationFunnel(sections)
  const completionDonut = buildSellerCompletionDonut(sections)
  const completionMetric = findSellerMetric(
    sections,
    'donations',
    'completionRate',
  )
  const publishedKgSeries = findSellerSeries(
    sections,
    'publishedKgByMonth',
  )
  const donationsSeries = findSellerSeries(
    sections,
    'donationsByMonth',
  )
  const publishedKgTrend = buildSellerMonthlyTrend(publishedKgSeries)
  const donationsTrend = buildSellerMonthlyTrend(donationsSeries)
  const loyaltyBars = buildSellerLoyaltyBars(sections)
  const essentialMetrics = selectSellerEssentialMetrics(sections)

  return (
    <div className="seller-metrics-page">
      <DashboardHeader
        description={messages.subtitle}
        eyebrow={messages.eyebrow}
        periodLabel={periodLabel}
        status={dashboard.data?.simulated ? <SimuladoBadge /> : undefined}
        title={messages.title}
      />

      {dashboard.isPending ? (
        <LoadingState label={messages.loading} />
      ) : dashboard.isError ? (
        <Card>
          <EmptyState
            action={
              <Button icon="refresh" onClick={() => void dashboard.refetch()}>
                {messages.retry}
              </Button>
            }
            description={dashboard.error.message}
            icon="warning"
            title={messages.loadErrorTitle}
          />
        </Card>
      ) : (
        <>
          <section
            aria-labelledby="seller-flow-title"
            className="seller-visual-grid"
          >
            <Card className="seller-chart-card seller-chart-card--flow">
              <div className="seller-chart-card__heading">
                <div>
                  <span>{messages.charts.flowEyebrow}</span>
                  <h2 id="seller-flow-title">{messages.charts.flowTitle}</h2>
                </div>
                <p>{messages.charts.flowDescription}</p>
              </div>
              {donationFunnel.length > 0 ? (
                <BarFunnelChart
                  ariaLabel={messages.charts.flowAriaLabel}
                  data={donationFunnel}
                  valueFormatter={(value) =>
                    formatDashboardValue(value, 'kg')
                  }
                  variant="funnel"
                />
              ) : (
                <p className="seller-chart-empty">
                  {messages.charts.unavailable}
                </p>
              )}
            </Card>

            <Card className="seller-chart-card seller-chart-card--donut">
              <div className="seller-chart-card__heading">
                <div>
                  <span>{messages.charts.completionEyebrow}</span>
                  <h2>{messages.charts.completionTitle}</h2>
                </div>
                <p>{messages.charts.completionDescription}</p>
              </div>
              {completionDonut.length > 0 ? (
                <DonutChart
                  ariaLabel={messages.charts.completionAriaLabel}
                  centerLabel={messages.charts.completionCenterLabel}
                  centerValue={
                    completionMetric?.value === null ||
                    completionMetric?.value === undefined
                      ? undefined
                      : formatDashboardValue(
                          completionMetric.value,
                          completionMetric.unit,
                        )
                  }
                  data={completionDonut}
                  valueFormatter={(value) =>
                    formatDashboardValue(value, '%')
                  }
                />
              ) : (
                <p className="seller-chart-empty">
                  {messages.charts.unavailable}
                </p>
              )}
            </Card>
          </section>

          <section
            aria-labelledby="seller-trends-title"
            className="seller-dashboard-section"
          >
            <div className="seller-dashboard-section__heading">
              <span>{messages.charts.trendsEyebrow}</span>
              <h2 id="seller-trends-title">{messages.charts.trendsTitle}</h2>
              <p>{messages.charts.trendsDescription}</p>
            </div>
            <div className="seller-trend-grid">
              <Card className="seller-chart-card">
                <h3>{publishedKgSeries?.label ?? messages.charts.kgTrend}</h3>
                {publishedKgTrend.length > 0 ? (
                  <LineChart
                    ariaLabel={messages.charts.kgTrendAriaLabel}
                    data={publishedKgTrend}
                    valueFormatter={(value) =>
                      formatDashboardValue(value, 'kg')
                    }
                  />
                ) : (
                  <p className="seller-chart-empty">
                    {messages.charts.noMonthlyData}
                  </p>
                )}
              </Card>
              <Card className="seller-chart-card">
                <h3>
                  {donationsSeries?.label ?? messages.charts.donationsTrend}
                </h3>
                {donationsTrend.length > 0 ? (
                  <LineChart
                    ariaLabel={messages.charts.donationsTrendAriaLabel}
                    data={donationsTrend}
                    tone="info"
                    valueFormatter={(value) =>
                      formatDashboardValue(value, 'doações')
                    }
                  />
                ) : (
                  <p className="seller-chart-empty">
                    {messages.charts.noMonthlyData}
                  </p>
                )}
              </Card>
            </div>
          </section>

          <section className="seller-summary-grid">
            <Card className="seller-chart-card">
              <div className="seller-chart-card__heading">
                <div>
                  <span>{messages.charts.loyaltyEyebrow}</span>
                  <h2>{messages.charts.loyaltyTitle}</h2>
                </div>
                <p>{messages.charts.loyaltyDescription}</p>
              </div>
              {loyaltyBars.length > 0 ? (
                <BarFunnelChart
                  ariaLabel={messages.charts.loyaltyAriaLabel}
                  data={loyaltyBars}
                  valueFormatter={(value) =>
                    formatDashboardValue(value, '%')
                  }
                />
              ) : (
                <p className="seller-chart-empty">
                  {messages.charts.unavailable}
                </p>
              )}
            </Card>

            <Card className="seller-essential-card">
              <div className="seller-chart-card__heading">
                <div>
                  <span>{messages.essentials.eyebrow}</span>
                  <h2>{messages.essentials.title}</h2>
                </div>
                <p>{messages.essentials.description}</p>
              </div>
              <MetricGrid
                ariaLabel={messages.essentials.ariaLabel}
                metrics={essentialMetrics}
              />
            </Card>
          </section>

          <aside className="seller-fiscal-notice" role="note">
            <strong>{messages.fiscalNoticeTitle}</strong>
            <p>{dashboard.data.fiscalNotice}</p>
          </aside>
          <EvidenceLegend label={messages.evidenceLabel} />
        </>
      )}

      <section
        className="seller-ratings"
        aria-labelledby="seller-ratings-title"
      >
        <div className="seller-ratings__heading">
          <span>{messages.ratings.eyebrow}</span>
          <h2 id="seller-ratings-title">{messages.ratings.title}</h2>
          <p>{messages.ratings.description}</p>
        </div>

        {opportunities.isPending ? (
          <LoadingState label={messages.ratings.loading} />
        ) : opportunities.isError ? (
          <Card>
            <EmptyState
              action={
                <Button
                  icon="refresh"
                  onClick={() => void opportunities.refetch()}
                >
                  {messages.retry}
                </Button>
              }
              description={opportunities.error.message}
              icon="warning"
              title={messages.ratings.loadErrorTitle}
            />
          </Card>
        ) : opportunities.data.items.length === 0 ? (
          <Card>
            <EmptyState
              description={messages.ratings.emptyDescription}
              icon="check"
              title={messages.ratings.emptyTitle}
            />
          </Card>
        ) : (
          <div className="seller-ratings__list">
            {opportunities.data.items.map((opportunity) => {
              const isCurrentSubmission =
                submitRating.variables?.pickupId === opportunity.pickupId

              return (
                <DriverRatingForm
                  isDisabled={submitRating.isPending}
                  isSubmitting={
                    submitRating.isPending && isCurrentSubmission
                  }
                  key={opportunity.pickupId}
                  onSubmit={(request) =>
                    handleRatingSubmit(opportunity.pickupId, request)
                  }
                  opportunity={opportunity}
                  submissionError={
                    submitRating.isError && isCurrentSubmission
                      ? submitRating.error.message
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
