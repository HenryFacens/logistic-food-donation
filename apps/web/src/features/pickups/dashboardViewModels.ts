import type { DashboardMetric, DashboardSection } from '@resgata/shared'
import type { ChartDatum } from '../../shared/ui'
import { pickupDashboardLabels } from './messages'

const findSection = (
  sections: DashboardSection[],
  key: string,
): DashboardSection | undefined =>
  sections.find((section) => section.key === key)

const findMetric = (
  section: DashboardSection | undefined,
  key: string,
): DashboardMetric | undefined =>
  section?.metrics.find((metric) => metric.key === key)

const metricDatum = (
  section: DashboardSection | undefined,
  key: string,
  label: string,
  tone: ChartDatum['tone'],
  transform: (value: number) => number = (value) => value,
): ChartDatum | null => {
  const metric = findMetric(section, key)

  if (!metric || metric.value === null) return null

  return {
    label,
    tone,
    value: transform(metric.value),
  }
}

const compactData = (
  data: Array<ChartDatum | null>,
): ChartDatum[] => data.filter((datum): datum is ChartDatum => datum !== null)

const selectMetrics = (
  section: DashboardSection | undefined,
  keys: string[],
): DashboardMetric[] =>
  keys
    .map((key) => findMetric(section, key))
    .filter((metric): metric is DashboardMetric => metric !== undefined)

const percentageParts = (
  section: DashboardSection | undefined,
  key: string,
  positiveLabel: string,
  remainderLabel: string,
): ChartDatum[] => {
  const metric = findMetric(section, key)

  if (!metric || metric.value === null) return []

  return [
    {
      label: positiveLabel,
      tone: 'success',
      value: metric.value,
    },
    {
      label: remainderLabel,
      tone: 'muted',
      value: Math.max(100 - metric.value, 0),
    },
  ]
}

export interface DriverDashboardViewModel {
  completionMetric?: DashboardMetric
  completionStatus: ChartDatum[]
  deadlineStatus: ChartDatum[]
  funnel: ChartDatum[]
  geolocationMetric?: DashboardMetric
  geolocationStatus: ChartDatum[]
  operationalMetrics: DashboardMetric[]
  ratingMetrics: DashboardMetric[]
  ratings: ChartDatum[]
  rewardMetrics: DashboardMetric[]
  timesInMinutes: ChartDatum[]
  weights: ChartDatum[]
}

export const buildDriverDashboardViewModel = (
  sections: DashboardSection[],
): DriverDashboardViewModel => {
  const operations = findSection(sections, 'operations')
  const reputation = findSection(sections, 'reputation')
  const rewards = findSection(sections, 'rewards')

  return {
    completionMetric: findMetric(operations, 'completionRate'),
    completionStatus: compactData([
      metricDatum(
        operations,
        'completedMissions',
        pickupDashboardLabels.completed,
        'success',
      ),
      metricDatum(
        operations,
        'cancelledMissions',
        pickupDashboardLabels.cancelled,
        'danger',
      ),
    ]),
    deadlineStatus: compactData([
      metricDatum(
        operations,
        'onTimeDeliveries',
        pickupDashboardLabels.deliveryWithinDeadline,
        'success',
      ),
      metricDatum(
        operations,
        'lateDeliveries',
        pickupDashboardLabels.lateDeliveries,
        'warning',
      ),
    ]),
    funnel: compactData([
      metricDatum(
        operations,
        'availableMissions',
        pickupDashboardLabels.missionsAvailable,
        'info',
      ),
      metricDatum(
        operations,
        'acceptedMissions',
        pickupDashboardLabels.accepted,
        'primary',
      ),
      metricDatum(
        operations,
        'completedMissions',
        pickupDashboardLabels.completed,
        'success',
      ),
    ]),
    geolocationMetric: findMetric(
      reputation,
      'geolocationConfirmationRate',
    ),
    geolocationStatus: percentageParts(
      reputation,
      'geolocationConfirmationRate',
      pickupDashboardLabels.confirmedLocation,
      pickupDashboardLabels.unconfirmedLocation,
    ),
    operationalMetrics: selectMetrics(operations, [
      'distanceKm',
      'completeEvidenceRate',
    ]),
    ratingMetrics: selectMetrics(reputation, [
      'reliabilityIndex',
      'driverLevel',
      'occurrences',
      'lateRecurrenceRate',
    ]),
    ratings: compactData([
      metricDatum(
        reputation,
        'ngoRating',
        pickupDashboardLabels.driverRatingsNgo,
        'primary',
      ),
      metricDatum(
        reputation,
        'sellerRating',
        pickupDashboardLabels.driverRatingsSeller,
        'info',
      ),
    ]),
    rewardMetrics: selectMetrics(rewards, [
      'pointsBalance',
      'couponsReceived',
      'couponsRedeemed',
      'benefitValue',
    ]),
    timesInMinutes: compactData([
      metricDatum(
        operations,
        'averageAcceptanceTime',
        pickupDashboardLabels.acceptance,
        'info',
        (seconds) => seconds / 60,
      ),
      metricDatum(
        operations,
        'averageCollectionTime',
        pickupDashboardLabels.collection,
        'primary',
      ),
      metricDatum(
        operations,
        'averageDeliveryTime',
        pickupDashboardLabels.delivery,
        'success',
      ),
    ]),
    weights: compactData([
      metricDatum(
        operations,
        'transportedWeightKg',
        pickupDashboardLabels.transported,
        'primary',
      ),
      metricDatum(
        operations,
        'deliveredWeightKg',
        pickupDashboardLabels.deliveredAndChecked,
        'success',
      ),
    ]),
  }
}

export interface NgoDashboardViewModel {
  capacityMetric?: DashboardMetric
  capacityStatus: ChartDatum[]
  conditionStatus: ChartDatum[]
  distributionFlow: ChartDatum[]
  gapMetrics: DashboardMetric[]
  operationalMetrics: DashboardMetric[]
  receiptConfirmationMetric?: DashboardMetric
  receiptConfirmationStatus: ChartDatum[]
}

export const buildNgoDashboardViewModel = (
  sections: DashboardSection[],
): NgoDashboardViewModel => {
  const receiving = findSection(sections, 'receiving')
  const logistics = findSection(sections, 'logistics')
  const distribution = findSection(sections, 'communityDistribution')
  const social = findSection(sections, 'socialEffectiveness')

  return {
    capacityMetric: findMetric(logistics, 'usedCapacityRate'),
    capacityStatus: compactData([
      metricDatum(
        logistics,
        'usedCapacityRate',
        pickupDashboardLabels.capacityUsed,
        'primary',
      ),
      metricDatum(
        logistics,
        'idleCapacityRate',
        pickupDashboardLabels.capacityIdle,
        'muted',
      ),
    ]),
    conditionStatus: compactData([
      metricDatum(
        receiving,
        'allGoodReceipts',
        pickupDashboardLabels.receiptAllGood,
        'success',
      ),
      metricDatum(
        receiving,
        'partialReceipts',
        pickupDashboardLabels.receiptPartial,
        'warning',
      ),
      metricDatum(
        receiving,
        'rejectedReceipts',
        pickupDashboardLabels.receiptRejected,
        'danger',
      ),
    ]),
    distributionFlow: compactData([
      metricDatum(
        distribution,
        'ngoReceivedWeight',
        pickupDashboardLabels.receivedByNgo,
        'primary',
      ),
      metricDatum(
        distribution,
        'communityDistributedWeight',
        pickupDashboardLabels.distributedToCommunity,
        'success',
      ),
    ]),
    gapMetrics: [
      ...selectMetrics(distribution, [
        'communityDistributedWeight',
        'distributionRate',
        'familiesServed',
        'peopleServed',
      ]),
      ...selectMetrics(social, [
        'coverageRate',
        'communityRating',
      ]),
    ],
    operationalMetrics: [
      ...selectMetrics(receiving, [
        'receivedDonations',
        'producers',
        'drivers',
        'offerToReceiptTime',
        'receivedWithinValidityRate',
      ]),
      ...selectMetrics(logistics, [
        'averageCollectionDistance',
        'completedRoutes',
        'avoidedLogisticsCost',
        'storageTime',
      ]),
    ],
    receiptConfirmationMetric: findMetric(
      receiving,
      'acceptedDeliveryRate',
    ),
    receiptConfirmationStatus: percentageParts(
      receiving,
      'acceptedDeliveryRate',
      pickupDashboardLabels.deliveryConfirmed,
      pickupDashboardLabels.deliveryPending,
    ),
  }
}
