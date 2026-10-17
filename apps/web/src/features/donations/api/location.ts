import {
  geocodeResultSchema,
  sellerProfileSchema,
  type Address,
  type GeoPoint,
} from '@resgata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiClient } from '../../../shared/api'

export const locationKeys = {
  sellerProfile: ['seller-profile'] as const,
}

export const useSellerProfile = (apiClient: ApiClient) =>
  useQuery({
    queryKey: locationKeys.sellerProfile,
    queryFn: async () =>
      sellerProfileSchema.parse(await apiClient.get('/sellers/me')),
    staleTime: 5 * 60_000,
  })

export const useSaveShopAddress = (apiClient: ApiClient) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (address: Address) =>
      sellerProfileSchema.parse(await apiClient.post('/sellers/me', { address })),
    onSuccess(profile) {
      queryClient.setQueryData(locationKeys.sellerProfile, profile)
    },
  })
}

export const lookupCep = async (apiClient: ApiClient, cep: string) =>
  geocodeResultSchema.parse(
    await apiClient.get(`/geo/cep/${encodeURIComponent(cep.replace(/\D/g, ''))}`),
  )

export const reverseGeocode = async (apiClient: ApiClient, point: GeoPoint) =>
  geocodeResultSchema.parse(
    await apiClient.get(`/geo/reverse?lat=${point.latitude}&lon=${point.longitude}`),
  )

export class LocationUnavailableError extends Error {}

/** Current device position; requires HTTPS (secure context) on phones. */
export const currentPosition = () =>
  new Promise<GeoPoint>((resolve, reject) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      reject(
        new LocationUnavailableError(
          'O GPS só funciona em conexão segura (https). Use o CEP ou o endereço da loja.',
        ),
      )
      return
    }
    if (!navigator.geolocation) {
      reject(new LocationUnavailableError('Este aparelho não oferece GPS.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) =>
        reject(
          new LocationUnavailableError(
            error.code === error.PERMISSION_DENIED
              ? 'Permissão de localização negada. Libere o acesso ou use o CEP.'
              : 'Não foi possível obter a localização. Tente novamente.',
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 },
    )
  })
