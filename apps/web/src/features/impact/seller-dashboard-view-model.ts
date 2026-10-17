import type {
  DashboardMetric,
  DashboardSection,
  MonthlyMetricSeries,
} from '@resgata/shared'
import type { ChartDatum } from '../../shared/ui'

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: 'UTC',
  year: '2-digit',
})

const findSection = (
  sections: DashboardSection[],
  sectionKey: string,
) => sections.find((section) => section.key === sectionKey)

export const findSellerMetric = (
  sections: DashboardSection[],
  sectionKey: string,
  metricKey: string,
) => findSection(sections, sectionKey)?.metrics.find(
  (metric) => metric.key === metricKey,
)

export const findSellerSeries = (
  sections: DashboardSection[],
  seriesKey: string,
) =>
  sections
    .flatMap((section) => section.monthlySeries)
    .find((series) => series.key === seriesKey)

const metricDatum = (
  metric: DashboardMetric | undefined,
  tone: ChartDatum['tone'],
): ChartDatum | null =>
  metric?.value === null || metric?.value === undefined
    ? null
    : {
        label: metric.label,
        tone,
        value: metric.value,
      }

const presentData = (
  data: Array<ChartDatum | null>,
): ChartDatum[] => data.filter((datum): datum is ChartDatum => datum !== null)

export const buildSellerDonationFunnel = (
  sections: DashboardSection[],
) =>
  presentData([
    metricDatum(
      findSellerMetric(sections, 'donations', 'publishedWeightKg'),
      'muted',
    ),
    metricDatum(
      findSellerMetric(sections, 'donations', 'collectedWeightKg'),
      'info',
    ),
    metricDatum(
      findSellerMetric(sections, 'donations', 'receivedWeightKg'),
      'success',
    ),
  ])

export const buildSellerCompletionDonut = (
  sections: DashboardSection[],
): ChartDatum[] => {
  const completion = findSellerMetric(
    sections,
    'donations',
    'completionRate',
  )

  if (completion?.value === null || completion?.value === undefined) {
    return []
  }

  const concluded = Math.min(100, Math.max(0, completion.value))

  return [
    { label: 'Concluída', tone: 'success', value: concluded },
    {
      label: 'Ainda não concluída',
      tone: 'muted',
      value: 100 - concluded,
    },
  ]
}

export const buildSellerMonthlyTrend = (
  series: MonthlyMetricSeries | undefined,
): ChartDatum[] =>
  series?.points.flatMap((point) => {
    if (point.value === null) return []

    const [year, month] = point.month.split('-').map(Number)

    return [{
      label: monthFormatter.format(new Date(Date.UTC(year, month - 1, 1))),
      tone: 'primary' as const,
      value: point.value,
    }]
  }) ?? []

export const buildSellerLoyaltyBars = (
  sections: DashboardSection[],
) =>
  presentData([
    metricDatum(
      findSellerMetric(sections, 'loyalty', 'repeat30Days'),
      'info',
    ),
    metricDatum(
      findSellerMetric(sections, 'loyalty', 'repeat60Days'),
      'primary',
    ),
    metricDatum(
      findSellerMetric(sections, 'loyalty', 'repeat90Days'),
      'success',
    ),
  ])

const essentialMetricKeys = [
  ['donations', 'averagePublicationToCollection'],
  ['donations', 'collectedBeforeExpirationRate'],
  ['donations', 'qualityRejectionRate'],
  ['fiscal', 'grossDonationValue'],
  ['fiscal', 'receiptCount'],
  ['fiscal', 'avoidedDisposalCost'],
] as const

export const selectSellerEssentialMetrics = (
  sections: DashboardSection[],
) =>
  essentialMetricKeys.flatMap(([sectionKey, metricKey]) => {
    const metric = findSellerMetric(sections, sectionKey, metricKey)
    return metric ? [metric] : []
  })
