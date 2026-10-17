import {
  ngoAvailabilitySchema,
  ngoNeedSchema,
  type CreateNgoNeedRequest,
  type UpdateNgoAvailabilityRequest,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '../../../shared/api'

const parseNeeds = (response: { items: unknown[] }) =>
  ngoNeedSchema.array().parse(response.items)

export const needKeys = {
  all: ['needs'] as const,
  availability: ['needs', 'availability'] as const,
  mine: ['needs', 'mine'] as const,
  nearby: ['needs', 'nearby'] as const,
}

export const useNearbyNeeds = () => {
  const apiClient = useApiClient()
  return useQuery({
    queryKey: needKeys.nearby,
    queryFn: async () => parseNeeds(await apiClient.get('/needs')),
    staleTime: 60_000,
  })
}

export const useMyNeeds = () => {
  const apiClient = useApiClient()
  return useQuery({
    queryKey: needKeys.mine,
    queryFn: async () => parseNeeds(await apiClient.get('/ngo/needs')),
  })
}

export const useNgoAvailability = () => {
  const apiClient = useApiClient()
  return useQuery({
    queryKey: needKeys.availability,
    queryFn: async () => ngoAvailabilitySchema.parse(await apiClient.get('/ngo/availability')),
  })
}

export const useNeedMutations = () => {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: needKeys.all })
  return {
    cancel: useMutation({
      mutationFn: (needId: string) => apiClient.post(`/ngo/needs/${needId}/cancel`),
      onSuccess: refresh,
    }),
    create: useMutation({
      mutationFn: async (input: CreateNgoNeedRequest) =>
        ngoNeedSchema.parse(await apiClient.post('/ngo/needs', input)),
      onSuccess: refresh,
    }),
    updateAvailability: useMutation({
      mutationFn: async (input: UpdateNgoAvailabilityRequest) =>
        ngoAvailabilitySchema.parse(await apiClient.post('/ngo/availability', input)),
      onSuccess: (data) => queryClient.setQueryData(needKeys.availability, data),
    }),
  }
}
