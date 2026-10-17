import {
  createDonationRequestSchema,
  type Classification,
  type CreateDonationRequest,
  type Donation,
} from '@resgata/shared'

export interface DonationFormValues {
  availableFrom: string
  category: string
  city: string
  description: string
  district: string
  estimatedWeightKg: string
  expiresAt: string
  latitude: string
  line1: string
  longitude: string
  perishabilityMinutes: string
  postalCode: string
  quantity: string
  state: string
  unit: string
}

const demoPickupLocation = { latitude: -22.8974, longitude: -47.051 }

const selectedLocation = (values: DonationFormValues) => {
  const latitude = Number(values.latitude)
  const longitude = Number(values.longitude)
  if (
    values.latitude.trim() === '' ||
    values.longitude.trim() === '' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return demoPickupLocation
  }
  return { latitude, longitude }
}

export interface DonationPublishOperation {
  body: CreateDonationRequest
  idempotencyKey: string
  kind: 'donation.publish'
  method: 'POST'
  path: '/donations'
}

export type DonationPublishOutcome =
  | { donation: Donation; status: 'confirmed' }
  | { operationId?: string; status: 'queued' }

export type DonationPublisher = (
  operation: DonationPublishOperation,
) => Promise<DonationPublishOutcome>

const localDateToIso = (value: string) => new Date(value).toISOString()

export const buildDonationRequest = (
  values: DonationFormValues,
  classification?: Classification | null,
) =>
  createDonationRequestSchema.parse({
    availableFrom: localDateToIso(values.availableFrom),
    category: values.category || classification?.category,
    classification: classification || undefined,
    description: values.description,
    estimatedWeightKg: Number(values.estimatedWeightKg),
    expiresAt: localDateToIso(values.expiresAt),
    perishabilityMinutes: Number(values.perishabilityMinutes),
    pickupAddress: {
      city: values.city || 'Campinas',
      district: values.district,
      line1: values.line1,
      location: selectedLocation(values),
      postalCode: values.postalCode,
      state: values.state || 'SP',
    },
    quantity: Number(values.quantity),
    unit: values.unit,
  })

export const buildDonationPublishOperation = (
  body: CreateDonationRequest,
  idempotencyKey: string,
): DonationPublishOperation => ({
  body,
  idempotencyKey,
  kind: 'donation.publish',
  method: 'POST',
  path: '/donations',
})

export const createStableIdempotencyRegistry = (
  createKey: () => string,
) => {
  const keys = new Map<string, string>()
  return {
    forget(body: CreateDonationRequest) {
      keys.delete(JSON.stringify(body))
    },
    keyFor(body: CreateDonationRequest) {
      const fingerprint = JSON.stringify(body)
      const existing = keys.get(fingerprint)
      if (existing) return existing
      const key = createKey()
      keys.set(fingerprint, key)
      return key
    },
  }
}
