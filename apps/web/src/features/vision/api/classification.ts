import {
  classificationSchema,
  type Classification,
  type ClassifyDonationRequest,
} from '@resgata/shared'
import { useMutation } from '@tanstack/react-query'
import type { ApiClient } from '../../../shared/api'

export const visionKeys = {
  all: ['vision'] as const,
}

export const classifyDonation = async (
  apiClient: ApiClient,
  request: ClassifyDonationRequest,
): Promise<Classification> => {
  const response = await apiClient.post<unknown>('/vision/classify', request)
  return classificationSchema.parse(response)
}

export const useVisionClassification = (apiClient: ApiClient) =>
  useMutation({
    mutationKey: [...visionKeys.all, 'classify'],
    mutationFn: (request: ClassifyDonationRequest) =>
      classifyDonation(apiClient, request),
  })
