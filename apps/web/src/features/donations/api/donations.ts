import {
  donationEventSchema,
  donationListSchema,
  donationSchema,
  matchingExplanationSchema,
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
    // Keep statuses live (accepted, driver on the way, delivered) while
    // anything is still in progress.
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (donation) => !['delivered', 'expired', 'no_destination', 'cancelled'].includes(donation.status),
      )
        ? 10_000
        : false,
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

const LIVE_STATUSES: readonly DonationStatus[] = ['posted', 'classified', 'offered']

/** Latest matching ranking; polls while the donation is still being placed. */
export const useDonationMatching = (
  apiClient: ApiClient,
  donationId: string,
  status: DonationStatus,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && Boolean(donationId),
    queryKey: [...donationKeys.detail(donationId), 'matching'] as const,
    queryFn: async () =>
      matchingExplanationSchema.parse(
        await apiClient.get(`/donations/${donationId}/matching`),
      ),
    refetchInterval: LIVE_STATUSES.includes(status) ? 3_000 : false,
  })
