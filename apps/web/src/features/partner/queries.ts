import {
  couponRedemptionSchema,
  demoUserSchema,
  nonEmptyTextSchema,
  partnerDashboardSchema,
  uuidSchema,
} from '@resgata/shared'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '../../shared/api'

const partnerRedemptionSchema = couponRedemptionSchema.extend({
  couponTitle: nonEmptyTextSchema,
})

const partnerProfileSchema = demoUserSchema.extend({
  profileId: uuidSchema,
})

const parseRedemptionList = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('items' in value)) {
    throw new Error('Resposta de resgates inválida.')
  }
  const items = value.items
  if (!Array.isArray(items)) throw new Error('Lista de resgates inválida.')
  return { items: items.map((item) => partnerRedemptionSchema.parse(item)) }
}

export const partnerQueryKeys = {
  all: ['partner'] as const,
  dashboard: () => [...partnerQueryKeys.all, 'dashboard'] as const,
  profile: () => [...partnerQueryKeys.all, 'profile'] as const,
  redemptions: (partnerId: string) =>
    [...partnerQueryKeys.all, 'redemptions', partnerId] as const,
}

export const usePartnerProfileQuery = () => {
  const api = useApiClient()
  return useQuery({
    queryKey: partnerQueryKeys.profile(),
    queryFn: async () => {
      const profile = partnerProfileSchema.parse(await api.get<unknown>('/me'))
      if (profile.role !== 'partner') {
        throw new Error('O perfil ativo não pertence a um parceiro.')
      }
      return profile
    },
  })
}

export const usePartnerDashboardQuery = (enabled: boolean) => {
  const api = useApiClient()
  return useQuery({
    enabled,
    queryKey: partnerQueryKeys.dashboard(),
    queryFn: async () =>
      partnerDashboardSchema.parse(
        await api.get<unknown>('/partner/dashboard'),
      ),
  })
}

export const usePartnerRedemptionsQuery = (partnerId: string | undefined) => {
  const api = useApiClient()
  return useQuery({
    enabled: Boolean(partnerId),
    queryKey: partnerQueryKeys.redemptions(partnerId || 'pending'),
    queryFn: async () =>
      parseRedemptionList(
        await api.get<unknown>(
          `/partners/${encodeURIComponent(partnerId!)}/redemptions`,
        ),
      ),
  })
}
