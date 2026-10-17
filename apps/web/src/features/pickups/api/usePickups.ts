import {
  createDeliveryReceiptRequestSchema,
  deliveryReceiptSchema,
  demoUserSchema,
  pickupListSchema,
  pickupSchema,
  uuidSchema,
  type CreateDeliveryReceiptRequest,
  type DeliveryReceipt,
  type GeoPoint,
  type Pickup,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  createIdempotencyKey,
  useApiClient,
} from '../../../shared/api'
import { useToast } from '../../../shared/ui'
import { pickupMessages } from '../messages'
import { pickupQueryKeys } from '../queryKeys'

const currentDemoUserSchema = demoUserSchema.extend({ profileId: uuidSchema })

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

export function usePickups(audience: 'driver' | 'ngo') {
  const api = useApiClient()
  return useQuery({
    queryKey: pickupQueryKeys.list(audience),
    queryFn: async () => pickupListSchema.parse(await api.get('/pickups?limit=50')),
  })
}

export function usePickupActions() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const toast = useToast()
  const stableKeys = useStableMutationKeys()

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: pickupQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['coupons'] }),
      queryClient.invalidateQueries({ queryKey: ['impact'] }),
    ])
  }

  const assign = useMutation({
    mutationFn: async (pickupId: string): Promise<Pickup> => {
      const profile = currentDemoUserSchema.parse(
        await api.get<unknown>('/me'),
      )
      if (profile.role !== 'driver') {
        throw new Error('O perfil de motorista não possui identificador de demonstração.')
      }
      const scope = `assign:${pickupId}`
      const response = await api.post(
        `/pickups/${pickupId}/assign`,
        { driverId: profile.profileId },
        { idempotencyKey: stableKeys.get(scope) },
      )
      const parsed = pickupSchema.parse(response)
      stableKeys.clear(scope)
      return parsed
    },
    onSuccess: async () => {
      await refresh()
      toast.show(pickupMessages.assignSuccess, 'success')
    },
  })

  const confirm = useMutation({
    mutationFn: async ({
      action,
      code,
      location,
      pickupId,
    }: {
      action: 'collect' | 'deliver'
      code: string
      location: GeoPoint
      pickupId: string
    }): Promise<Pickup> => {
      const scope = `${action}:${pickupId}`
      const response = await api.post(
        `/pickups/${pickupId}/${action}`,
        { code, location },
        { idempotencyKey: stableKeys.get(scope) },
      )
      const parsed = pickupSchema.parse(response)
      stableKeys.clear(scope)
      return parsed
    },
    onSuccess: async (_result, variables) => {
      await refresh()
      toast.show(
        variables.action === 'collect'
          ? pickupMessages.collectSuccess
          : pickupMessages.deliverSuccess,
        'success',
      )
    },
  })

  const createReceipt = useMutation({
    mutationFn: async ({
      pickupId,
      receipt,
    }: {
      pickupId: string
      receipt: CreateDeliveryReceiptRequest
    }): Promise<DeliveryReceipt> => {
      const parsedRequest = createDeliveryReceiptRequestSchema.parse(receipt)
      const scope = `receipt:${pickupId}:${JSON.stringify(parsedRequest)}`
      const response = await api.post(
        `/pickups/${pickupId}/receipt`,
        parsedRequest,
        { idempotencyKey: stableKeys.get(scope) },
      )
      const parsed = deliveryReceiptSchema.parse(response)
      stableKeys.clear(scope)
      return parsed
    },
    onSuccess: async () => {
      await refresh()
      toast.show(pickupMessages.receiptSuccess, 'success')
    },
  })

  return { assign, confirm, createReceipt }
}
