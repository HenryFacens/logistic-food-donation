import {
  platformDashboardSchema,
  queueDashboardSchema,
  replayDeadLetterResponseSchema,
} from '@resgata/shared'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useApiClient } from '../../shared/api'
import { createReplayIdempotencyKey } from './view-model'

export interface DeadLetter {
  aggregateId: string
  attempts: number
  correlationId: string
  deadLetteredAt: string
  error: string
  eventType: string
  id: string
  originalMessageId: string
  payload: Record<string, unknown>
  replayedAt: string | null
  topic: string
}

interface DeadLetterList {
  items: DeadLetter[]
  page: {
    hasMore: boolean
    nextCursor: string | null
  }
}

const parseDeadLetterList = (value: unknown): DeadLetterList => {
  if (!value || typeof value !== 'object' || !('items' in value)) {
    throw new Error('Resposta de mensagens mortas inválida.')
  }
  const candidate = value as Partial<DeadLetterList>
  if (!Array.isArray(candidate.items)) {
    throw new Error('Lista de mensagens mortas inválida.')
  }
  return {
    items: candidate.items,
    page: candidate.page || { hasMore: false, nextCursor: null },
  }
}

export const adminQueryKeys = {
  all: ['admin'] as const,
  deadLetters: (topic: string) =>
    [...adminQueryKeys.all, 'dead-letters', topic || 'all'] as const,
  platformDashboard: () =>
    [...adminQueryKeys.all, 'platform-dashboard'] as const,
  queues: () => [...adminQueryKeys.all, 'queues'] as const,
}

export const usePlatformDashboardQuery = () => {
  const api = useApiClient()
  return useQuery({
    queryKey: adminQueryKeys.platformDashboard(),
    queryFn: async () =>
      platformDashboardSchema.parse(
        await api.get<unknown>(
          '/platform/dashboard?includeMonthlySeries=true',
        ),
      ),
  })
}

export const useQueueDashboardQuery = () => {
  const api = useApiClient()
  return useQuery({
    queryKey: adminQueryKeys.queues(),
    queryFn: async () =>
      queueDashboardSchema.parse(await api.get<unknown>('/admin/queues')),
    refetchInterval: 15_000,
  })
}

export const useDeadLettersQuery = (topic: string) => {
  const api = useApiClient()
  const query = topic
    ? `?limit=50&topic=${encodeURIComponent(topic)}`
    : '?limit=50'
  return useQuery({
    queryKey: adminQueryKeys.deadLetters(topic),
    queryFn: async () =>
      parseDeadLetterList(
        await api.get<unknown>(`/admin/dead-letters${query}`),
      ),
  })
}

export const useReplayDeadLettersMutation = () => {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageIds: string[]) =>
      replayDeadLetterResponseSchema.parse(
        await api.post<unknown>(
          '/admin/dead-letters/replay',
          { messageIds },
          { idempotencyKey: createReplayIdempotencyKey(messageIds) },
        ),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.all })
    },
  })
}
