import { LoadingState } from '../../../shared/ui'
import { useNgoDashboard } from '../api/usePickupDashboards'
import {
  DashboardFailure,
  MetricsDashboard,
} from '../components/MetricsDashboard'
import { pickupMessages } from '../messages'
import '../pickups.css'

export function NgoDashboardPage() {
  const dashboard = useNgoDashboard()

  if (dashboard.isPending) {
    return <LoadingState label="Consolidando recebimentos e distribuição" />
  }

  if (dashboard.isError) {
    return (
      <DashboardFailure
        description={pickupMessages.ngoDashboardLoadError}
        onRetry={() => void dashboard.refetch()}
      />
    )
  }

  return (
    <MetricsDashboard
      audience="ngo"
      description={pickupMessages.ngoDashboardDescription}
      eyebrow={pickupMessages.ngoDashboardEyebrow}
      generatedAt={dashboard.data.generatedAt}
      onRefresh={() => void dashboard.refetch()}
      periodEnd={dashboard.data.periodEnd}
      periodStart={dashboard.data.periodStart}
      refreshing={dashboard.isFetching}
      sections={dashboard.data.sections}
      simulated={dashboard.data.simulated}
      title={pickupMessages.ngoDashboardTitle}
    />
  )
}
