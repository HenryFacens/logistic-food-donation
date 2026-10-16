import {
  donationEventSchema,
  donationListSchema,
  donationSchema,
  type Donation,
  type DonationStatus,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiClient } from '../../../shared/api'
import type {
  DonationPublishOperation,
  DonationPublishOutcome,
  DonationPublisher,
} from '../model/publish'

export const donationKeys = {
  all: ['donations'] as const,
  detail: (donationId: string) =>
    [...donationKeys.all, 'detail', donationId] as const,
  events: (donationId: string) =>
    [...donationKeys.detail(donationId), 'events'] as const,
  list: (filters: { limit: number; status?: DonationStatus }) =>
    [...donationKeys.all, 'list', filters] as const,
}

export const useDonations = (
  apiClient: ApiClient,
  filters: { limit?: number; status?: DonationStatus } = {},
) => {
  const limit = filters.limit || 50
  const search = new URLSearchParams({ limit: String(limit) })
  if (filters.status) search.set('status', filters.status)
  return useQuery({
    queryKey: donationKeys.list({ limit, status: filters.status }),
    queryFn: async () =>
      donationListSchema.parse(
        await apiClient.get<unknown>(`/donations?${search.toString()}`),
      ),
  })
}

export const useDonationEvents = (
  apiClient: ApiClient,
  donationId: string,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && Boolean(donationId),
    queryKey: donationKeys.events(donationId),
    queryFn: async () => {
      const response = await apiClient.get<{ items: unknown[] }>(
        `/donations/${donationId}/events`,
      )
      return donationEventSchema.array().parse(response.items)
    },
  })

export const createOnlineDonationPublisher =
  (apiClient: ApiClient): DonationPublisher =>
  async (operation: DonationPublishOperation): Promise<DonationPublishOutcome> => {
    const donation = donationSchema.parse(
      await apiClient.post<Donation>(
        operation.path,
        operation.body,
        { idempotencyKey: operation.idempotencyKey },
      ),
    )
    return { donation, status: 'confirmed' }
  }

export const usePublishDonation = (
  apiClient: ApiClient,
  publisher: DonationPublisher = createOnlineDonationPublisher(apiClient),
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: [...donationKeys.all, 'publish'],
    mutationFn: publisher,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: donationKeys.all })
    },
  })
}
