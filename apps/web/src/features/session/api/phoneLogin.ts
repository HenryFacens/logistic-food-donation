import {
  requestLoginCodeResponseSchema,
  sessionResponseSchema,
  type SessionResponse,
} from '@resgata/shared'
import { useMutation } from '@tanstack/react-query'
import type { ApiClient } from '../../../shared/api'

export const useRequestLoginCode = (apiClient: ApiClient) =>
  useMutation({
    mutationFn: async (phone: string) =>
      requestLoginCodeResponseSchema.parse(
        await apiClient.post('/auth/code', { phone }),
      ),
  })

export const useVerifyLoginCode = (apiClient: ApiClient) =>
  useMutation({
    mutationFn: async (input: { code: string; phone: string }) =>
      sessionResponseSchema.parse(
        await apiClient.post('/auth/verify', input),
      ) as SessionResponse,
  })
