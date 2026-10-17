import {
  createDeliveryReceiptRequestSchema,
  deliveryReceiptSchema,
  pickupListSchema,
  pickupSchema,
  type CreateDeliveryReceiptRequest,
  type DeliveryReceipt,
  currentDemoUserSchema,
  type CurrentDemoUser,
  type GeoPoint,
  type Pickup,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  ApiClientError,
  createIdempotencyKey,
  useApiClient,
} from '../../../shared/api'
import { useToast } from '../../../shared/ui'
import { pickupErrorMessage, pickupMessages } from '../messages'
import { pickupQueryKeys } from '../queryKeys'
import type { AcceptOutcome } from '../viewModels'

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

export function usePickups(
  audience: 'driver' | 'ngo',
  { refetchInterval }: { refetchInterval?: number | false } = {},
) {
  const api = useApiClient()
  return useQuery({
    queryKey: pickupQueryKeys.list(audience),
    queryFn: async () => pickupListSchema.parse(await api.get('/pickups?limit=100')),
    refetchInterval,
  })
}

/** Current demo profile; drivers also receive the vehicle `capacityKg`. */
export function useCurrentProfile() {
  const api = useApiClient()
  return useQuery({
    queryKey: pickupQueryKeys.profile(),
    queryFn: async (): Promise<CurrentDemoUser> =>
      currentDemoUserSchema.parse(await api.get<unknown>('/me')),
    // Never reuse another session's profile after switching users.
    staleTime: 0,
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

  const driverProfileId = async () => {
    const profile = await queryClient.fetchQuery({
      queryKey: pickupQueryKeys.profile(),
      queryFn: async () => currentDemoUserSchema.parse(await api.get<unknown>('/me')),
      staleTime: 0,
    })
    if (profile.role !== 'driver') {
      throw new Error('Entre novamente como motorista.')
    }
    return profile.profileId
  }

  // The key stays stable per pickup until a definitive answer, so a retry
  // after a lost response replays the same assignment instead of a new one.
  const assignToDriver = async (pickupId: string, driverId: string) => {
    const scope = `assign:${pickupId}`
    const response = await api.post(
      `/pickups/${pickupId}/assign`,
      { driverId },
      { idempotencyKey: stableKeys.get(scope) },
    )
    const parsed = pickupSchema.parse(response)
    stableKeys.clear(scope)
    return parsed
  }

  const assign = useMutation({
    mutationFn: async (pickupId: string): Promise<Pickup> =>
      assignToDriver(pickupId, await driverProfileId()),
    onSuccess: async () => {
      await refresh()
      toast.show(pickupMessages.assignSuccess, 'success')
    },
  })

  /** Accepts pickups one by one; a 409 means another driver took it first. */
  const acceptMany = useMutation({
    mutationFn: async (pickupIds: readonly string[]): Promise<AcceptOutcome> => {
      const driverId = await driverProfileId()
      const outcome: AcceptOutcome = { accepted: [], failed: [], taken: [] }
      for (const pickupId of pickupIds) {
        try {
          await assignToDriver(pickupId, driverId)
          outcome.accepted.push(pickupId)
        } catch (error) {
          if (
            error instanceof ApiClientError &&
            error.kind === 'conflict' &&
            error.code !== 'capacity_exceeded'
          ) {
            stableKeys.clear(`assign:${pickupId}`)
            outcome.taken.push(pickupId)
          } else {
            outcome.failed.push({
              id: pickupId,
              message: pickupErrorMessage(error, pickupMessages.assignError),
            })
          }
        }
      }
      return outcome
    },
    onSettled: refresh,
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
    // The driver screen celebrates each step (SuccessBurst, role="status").
    onSuccess: refresh,
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

  return { acceptMany, assign, confirm, createReceipt }
}
