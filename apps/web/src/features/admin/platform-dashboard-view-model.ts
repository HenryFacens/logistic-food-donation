import type { DashboardMetric, DashboardSection } from '@resgata/shared'
import type { ChartDatum } from '../../shared/ui'

const findSection = (
  sections: DashboardSection[],
  sectionKey: string,
) => sections.find((section) => section.key === sectionKey)

export const findPlatformMetric = (
  sections: DashboardSection[],
  sectionKey: string,
  metricKey: string,
) => findSection(sections, sectionKey)?.metrics.find(
  (metric) => metric.key === metricKey,
)

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

export const buildPlatformStageFunnel = (
  sections: DashboardSection[],
): ChartDatum[] => {
  const published = findPlatformMetric(
    sections,
    'operation',
    'publishedOffers',
  )
  const accepted = findPlatformMetric(
    sections,
    'operation',
    'acceptedOffers',
  )
  const collectionRate = findPlatformMetric(
    sections,
    'operation',
    'collectionCompletionRate',
  )
  const deliveryRate = findPlatformMetric(
    sections,
    'operation',
    'deliveryCompletionRate',
  )

  if (
    published?.value === null ||
    published?.value === undefined ||
    accepted?.value === null ||
    accepted?.value === undefined
  ) {
    return []
  }

  const collected =
    collectionRate?.value === null || collectionRate?.value === undefined
      ? null
      : Math.round(
          accepted.value *
            Math.min(100, Math.max(0, collectionRate.value)) /
            100,
        )
  const received =
    deliveryRate?.value === null || deliveryRate?.value === undefined
      ? null
      : Math.round(
          accepted.value *
            Math.min(100, Math.max(0, deliveryRate.value)) /
            100,
        )

  return presentData([
    { label: 'Publicadas', tone: 'muted', value: published.value },
    { label: 'Aceitas', tone: 'info', value: accepted.value },
    collected === null
      ? null
      : { label: 'Coletadas', tone: 'primary', value: collected },
    received === null
      ? null
      : { label: 'Recebidas', tone: 'success', value: received },
  ])
}

export const buildPlatformRateDonut = (
  metric: DashboardMetric | undefined,
  successLabel: string,
): ChartDatum[] => {
  if (metric?.value === null || metric?.value === undefined) return []

  const completed = Math.min(100, Math.max(0, metric.value))

  return [
    { label: successLabel, tone: 'success', value: completed },
    { label: 'Restante', tone: 'muted', value: 100 - completed },
  ]
}

export const buildPlatformUserBars = (
  sections: DashboardSection[],
) =>
  presentData([
    metricDatum(
      findPlatformMetric(sections, 'users', 'activeSellers'),
      'primary',
    ),
    metricDatum(
      findPlatformMetric(sections, 'users', 'activeDrivers'),
      'info',
    ),
    metricDatum(
      findPlatformMetric(sections, 'users', 'activeNgos'),
      'success',
    ),
    metricDatum(
      findPlatformMetric(sections, 'users', 'activePartners'),
      'warning',
    ),
  ])

export const buildPlatformQualityBars = (
  sections: DashboardSection[],
) =>
  presentData([
    metricDatum(
      findPlatformMetric(sections, 'operation', 'expiredOffers'),
      'warning',
    ),
    metricDatum(
      findPlatformMetric(sections, 'trust', 'qualityIncidents'),
      'danger',
    ),
  ])

const essentialMetricKeys = [
  ['operation', 'averageMatchingTime'],
  ['operation', 'collectionCompletionRate'],
  ['volume', 'movedWeightKg'],
  ['volume', 'rescuedEconomicValue'],
] as const

export const selectPlatformEssentialMetrics = (
  sections: DashboardSection[],
) =>
  essentialMetricKeys.flatMap(([sectionKey, metricKey]) => {
    const metric = findPlatformMetric(sections, sectionKey, metricKey)
    return metric ? [metric] : []
  })
