import {
  offerDecisionResponseSchema,
  offerListSchema,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  createIdempotencyKey,
  useApiClient,
} from '../../../shared/api'
import { useToast } from '../../../shared/ui'
import { offerMessages } from '../messages'
import { offerQueryKeys } from '../queryKeys'

const useStableMutationKeys = () => {
  const keys = useRef(new Map<string, string>())
  return {
    clear(scope: string) {
      keys.current.delete(scope)
    },
    get(scope: string) {
      const current = keys.current.get(scope)
      if (current) return current
      const key = createIdempotencyKey()
      keys.current.set(scope, key)
      return key
    },
  }
}

export function useOffers() {
  const api = useApiClient()
  return useQuery({
    queryKey: offerQueryKeys.list(),
    queryFn: async () => offerListSchema.parse(await api.get('/offers?limit=50')),
  })
}

export function useOfferDecision() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const toast = useToast()
  const stableKeys = useStableMutationKeys()

  return useMutation({
    mutationFn: async ({
      action,
      offerId,
      reason,
    }: {
      action: 'accept' | 'reject'
      offerId: string
      reason?: string
    }): Promise<ReturnType<typeof offerDecisionResponseSchema.parse>> => {
      const scope = `${action}:${offerId}`
      const response = await api.post(
        `/offers/${offerId}/${action}`,
        reason ? { reason } : {},
        { idempotencyKey: stableKeys.get(scope) },
      )
      const parsed = offerDecisionResponseSchema.parse(response)
      stableKeys.clear(scope)
      return parsed
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: offerQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['pickups'] }),
      ])
      toast.show(
        result.accepted
          ? offerMessages.acceptSuccess
          : offerMessages.rejectSuccess,
        'success',
      )
    },
  })
}
