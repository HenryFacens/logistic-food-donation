import {
  impactDashboardSchema,
  simulatedForecastSchema,
} from '@resgata/shared'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '../../shared/api'

export const impactQueryKeys = {
  all: ['impact'] as const,
  dashboard: () => [...impactQueryKeys.all, 'dashboard'] as const,
  forecast: () => [...impactQueryKeys.all, 'forecast'] as const,
}

export const useImpactDashboardQuery = () => {
  const api = useApiClient()
  return useQuery({
    queryKey: impactQueryKeys.dashboard(),
    queryFn: async () =>
      impactDashboardSchema.parse(await api.get<unknown>('/metrics/impact')),
  })
}

export const useImpactForecastQuery = () => {
  const api = useApiClient()
  return useQuery({
    queryKey: impactQueryKeys.forecast(),
    queryFn: async () =>
      simulatedForecastSchema.parse(await api.get<unknown>('/impact/forecast')),
  })
}
