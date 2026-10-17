import {
  driverDashboardSchema,
  ngoDashboardSchema,
} from '@resgata/shared'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '../../../shared/api'
import { pickupQueryKeys } from '../queryKeys'

export function useDriverDashboard() {
  const api = useApiClient()

  return useQuery({
    queryKey: pickupQueryKeys.dashboard('driver'),
    queryFn: async () =>
      driverDashboardSchema.parse(
        await api.get('/driver/dashboard?includeMonthlySeries=true'),
      ),
  })
}

export function useNgoDashboard() {
  const api = useApiClient()

  return useQuery({
    queryKey: pickupQueryKeys.dashboard('ngo'),
    queryFn: async () =>
      ngoDashboardSchema.parse(
        await api.get('/ngo/dashboard?includeMonthlySeries=true'),
      ),
  })
}
