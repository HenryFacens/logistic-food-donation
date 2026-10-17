import { LoadingState } from '../../../shared/ui'
import { useDriverDashboard } from '../api/usePickupDashboards'
import {
  DashboardFailure,
  MetricsDashboard,
} from '../components/MetricsDashboard'
import { pickupMessages } from '../messages'
import '../pickups.css'

export function DriverDashboardPage() {
  const dashboard = useDriverDashboard()

  if (dashboard.isPending) {
    return <LoadingState label="Consolidando suas missões e recompensas" />
  }

  if (dashboard.isError) {
    return (
      <DashboardFailure
        description={pickupMessages.driverDashboardLoadError}
        onRetry={() => void dashboard.refetch()}
      />
    )
  }

  return (
    <MetricsDashboard
      audience="driver"
      description={pickupMessages.driverDashboardDescription}
      eyebrow={pickupMessages.driverDashboardEyebrow}
      generatedAt={dashboard.data.generatedAt}
      onRefresh={() => void dashboard.refetch()}
      periodEnd={dashboard.data.periodEnd}
      periodStart={dashboard.data.periodStart}
      refreshing={dashboard.isFetching}
      sections={dashboard.data.sections}
      simulated={dashboard.data.simulated}
      title={pickupMessages.driverDashboardTitle}
    />
  )
}
