import {
  couponListSchema,
  couponRedemptionSchema,
  type CouponRedemption,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  createIdempotencyKey,
  useApiClient,
} from '../../../shared/api'
import { useToast } from '../../../shared/ui'
import { couponMessages } from '../messages'
import { couponQueryKeys } from '../queryKeys'

export function useCoupons() {
  const api = useApiClient()
  return useQuery({
    queryKey: couponQueryKeys.list(),
    queryFn: async () => couponListSchema.parse(await api.get('/coupons?limit=50')),
  })
}

export function useRedeemCoupon() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const toast = useToast()
  const keys = useRef(new Map<string, string>())

  return useMutation({
    mutationFn: async (couponId: string): Promise<CouponRedemption> => {
      const currentKey = keys.current.get(couponId) || createIdempotencyKey()
      keys.current.set(couponId, currentKey)
      const response = await api.post(
        `/coupons/${couponId}/redeem`,
        undefined,
        { idempotencyKey: currentKey },
      )
      const parsed = couponRedemptionSchema.parse(response)
      keys.current.delete(couponId)
      return parsed
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: couponQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['partner'] }),
      ])
      toast.show(couponMessages.redeemSuccess, 'success')
    },
  })
}
