import type { CreateDriverRatingRequest } from '@resgata/shared'
import {
  AppIcon,
  BarFunnelChart,
  Button,
  Card,
  DashboardHeader,
  EmptyState,
  EvidenceLegend,
  HeadlineMetrics,
  LoadingState,
  MetricGrid,
  MonthlySeriesBars,
  formatDashboardValue,
  useToast,
  type HeadlineMetric,
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
  buildSellerDonationFunnel,
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
  const publishedKgSeries = findSellerSeries(
    sections,
    'publishedKgByMonth',
  )
  const essentialMetrics = selectSellerEssentialMetrics(sections)

  const metric = (sectionKey: string, metricKey: string) =>
    findSellerMetric(sections, sectionKey, metricKey)
  const headline: HeadlineMetric[] = [
    { metric: metric('donations', 'receivedWeightKg'), label: 'conferidos pelas ONGs' },
    { metric: metric('fiscal', 'equivalentMeals'), label: 'equivalentes (aproximado)' },
    { metric: metric('donations', 'donations'), label: 'no período' },
    { metric: metric('fiscal', 'avoidedDisposalCost'), label: 'de descarte evitado' },
  ]

  return (
    <div className="seller-metrics-page">
      <DashboardHeader
        description={messages.subtitle}
        periodLabel={periodLabel}
        title={messages.title}
      />

      {opportunities.data?.items.length ? (
        <p className="seller-metrics-page__action">
          <AppIcon name="star" size={20} />
          <a href="#seller-ratings-title">
            {opportunities.data.items.length === 1
              ? 'Uma entrega espera sua avaliação do motorista'
              : `${opportunities.data.items.length} entregas esperam sua avaliação do motorista`}
          </a>
        </p>
      ) : null}

      {dashboard.isPending ? (
        <LoadingState label={messages.loading} />
      ) : dashboard.isError && !dashboard.data ? (
        <Card>
          <EmptyState
            action={
              <Button icon="refresh" onClick={() => void dashboard.refetch()}>
                {messages.retry}
              </Button>
            }
            description="Verifique sua conexão e tente de novo."
            icon="warning"
            title={messages.loadErrorTitle}
          />
        </Card>
      ) : (
        <>
          <HeadlineMetrics ariaLabel="Principais resultados" items={headline} />

          <Card className="seller-chart-card seller-chart-card--flow">
            <div className="seller-chart-card__heading">
              <h2 id="seller-flow-title">{messages.charts.flowTitle}</h2>
              <p>{messages.charts.flowDescription}</p>
            </div>
            {donationFunnel.length > 0 ? (
              <BarFunnelChart
                ariaLabel={messages.charts.flowAriaLabel}
                data={donationFunnel}
                valueFormatter={(value) => formatDashboardValue(value, 'kg')}
                variant="funnel"
              />
            ) : (
              <p className="seller-chart-empty">{messages.charts.unavailable}</p>
            )}
          </Card>

          {publishedKgSeries ? <MonthlySeriesBars series={publishedKgSeries} /> : null}

          <details className="screen-card seller-metrics-more">
            <summary>Mais números e como ler</summary>
            <MetricGrid ariaLabel={messages.essentials.ariaLabel} metrics={essentialMetrics} />
            <aside className="seller-fiscal-notice" role="note">
              <strong>{messages.fiscalNoticeTitle}</strong>
              <p>{dashboard.data.fiscalNotice}</p>
            </aside>
            <EvidenceLegend label={messages.evidenceLabel} />
          </details>
        </>
      )}

      <section
        className="seller-ratings"
        aria-labelledby="seller-ratings-title"
      >
        <div className="seller-ratings__heading">
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
