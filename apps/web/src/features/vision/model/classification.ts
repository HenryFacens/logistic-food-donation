import {
  classifyDonationRequestSchema,
  type ClassifyDonationRequest,
} from '@resgata/shared'

export type VisionMode = ClassifyDonationRequest['source']

export const createManualClassificationRequest = (
  manualDescription: string,
) =>
  classifyDonationRequestSchema.parse({
    manualDescription,
    source: 'manual',
  })

export const createImageClassificationRequest = (
  imageBase64: string,
  source: 'camera' | 'upload',
) =>
  classifyDonationRequestSchema.parse({
    imageBase64,
    source,
  })

export const imageFileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('file_read_failed'))
    reader.onload = () => {
      const result = String(reader.result || '')
      const separator = result.indexOf(',')
      resolve(separator >= 0 ? result.slice(separator + 1) : result)
    }
    reader.readAsDataURL(file)
  })

export const browserSupportsCameraCapture = () => {
  if (typeof document === 'undefined') return false
  return 'capture' in document.createElement('input')
}
