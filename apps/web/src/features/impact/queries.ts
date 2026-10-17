import {
  createDriverRatingRequestSchema,
  driverRatingSchema,
  impactDashboardSchema,
  ratingOpportunitiesResponseSchema,
  sellerDashboardSchema,
  simulatedForecastSchema,
  type CreateDriverRatingRequest,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createIdempotencyKey, useApiClient } from '../../shared/api'

export const impactQueryKeys = {
  all: ['impact'] as const,
  dashboard: () => [...impactQueryKeys.all, 'dashboard'] as const,
  forecast: () => [...impactQueryKeys.all, 'forecast'] as const,
  sellerDashboard: () =>
    [...impactQueryKeys.all, 'seller-dashboard'] as const,
  ratingOpportunities: {
    all: () =>
      [...impactQueryKeys.all, 'driver-rating-opportunities'] as const,
    available: (limit = 20) =>
      [
        ...impactQueryKeys.ratingOpportunities.all(),
        'available',
        limit,
      ] as const,
  },
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

export const useSellerDashboardQuery = () => {
  const api = useApiClient()
  return useQuery({
    queryKey: impactQueryKeys.sellerDashboard(),
    queryFn: async () =>
      sellerDashboardSchema.parse(
        await api.get<unknown>('/seller/dashboard'),
      ),
  })
}

export const useDriverRatingOpportunitiesQuery = (limit = 20) => {
  const api = useApiClient()
  return useQuery({
    queryKey: impactQueryKeys.ratingOpportunities.available(limit),
    queryFn: async () =>
      ratingOpportunitiesResponseSchema.parse(
        await api.get<unknown>(
          `/driver-ratings/opportunities?status=available&limit=${limit}`,
        ),
      ),
  })
}

export interface SubmitDriverRatingInput {
  idempotencyKey: string
  pickupId: string
  request: CreateDriverRatingRequest
}

export const createDriverRatingSubmission = (
  pickupId: string,
  request: CreateDriverRatingRequest,
): SubmitDriverRatingInput => ({
  idempotencyKey: createIdempotencyKey(),
  pickupId,
  request: createDriverRatingRequestSchema.parse(request),
})

export const useSubmitDriverRatingMutation = () => {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      idempotencyKey,
      pickupId,
      request,
    }: SubmitDriverRatingInput) => {
      const body = createDriverRatingRequestSchema.parse(request)
      return driverRatingSchema.parse(
        await api.post<unknown>(
          `/pickups/${pickupId}/driver-rating`,
          body,
          { idempotencyKey },
        ),
      )
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: impactQueryKeys.sellerDashboard(),
        }),
        queryClient.invalidateQueries({
          queryKey: impactQueryKeys.ratingOpportunities.all(),
        }),
      ])
    },
  })
}
