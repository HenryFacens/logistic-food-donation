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

// Long edge Claude analyzes without downscaling; larger photos only add
// upload time on mobile data.
export const MAX_IMAGE_EDGE = 1568

export const fitWithin = (width: number, height: number, maxEdge: number) => {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  }
}

const canvasToJpegBase64 = (canvas: HTMLCanvasElement) => {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

// Re-encodes camera photos as a bounded JPEG so any phone format the browser
// can decode (including HEIC on iOS) reaches the API as a supported image.
export const prepareImageForUpload = async (file: File) => {
  if (typeof createImageBitmap !== 'function') return imageFileToBase64(file)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return imageFileToBase64(file)
  }
  try {
    const { width, height } = fitWithin(
      bitmap.width,
      bitmap.height,
      MAX_IMAGE_EDGE,
    )
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return imageFileToBase64(file)
    context.drawImage(bitmap, 0, 0, width, height)
    return canvasToJpegBase64(canvas)
  } finally {
    bitmap.close()
  }
}
