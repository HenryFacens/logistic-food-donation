import {
  createDonationRequestSchema,
  type Classification,
  type CreateDonationRequest,
  type Donation,
} from '@resgata/shared'

export interface DonationFormValues {
  availableFrom: string
  category: string
  description: string
  district: string
  estimatedWeightKg: string
  expiresAt: string
  line1: string
  perishabilityMinutes: string
  postalCode: string
  quantity: string
  unit: string
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

export const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const formatAmount = (value: number) => String(Math.round(value * 10) / 10)

// Prefills the vendor form from an image analysis. The pickup deadline follows
// the estimated shelf life so NGOs never receive food past its safe window.
export const applyClassification = (
  values: DonationFormValues,
  classification: Classification,
): DonationFormValues => {
  const next: DonationFormValues = {
    ...values,
    category: classification.category,
    description: classification.description.replace(/\s+—\s+SIMULADO$/u, ''),
    perishabilityMinutes: String(classification.perishabilityMinutes),
  }
  if (classification.suggestedQuantity) {
    next.quantity = formatAmount(classification.suggestedQuantity)
  }
  if (classification.suggestedUnit) next.unit = classification.suggestedUnit
  if (classification.estimatedWeightKg) {
    next.estimatedWeightKg = formatAmount(classification.estimatedWeightKg)
  }
  const availableFrom = new Date(values.availableFrom)
  if (!Number.isNaN(availableFrom.getTime())) {
    next.expiresAt = toLocalInput(
      new Date(
        availableFrom.getTime() + classification.perishabilityMinutes * 60_000,
      ),
    )
  }
  return next
}

export const isUnsafeClassification = (
  classification?: Classification | null,
) => classification?.condition === 'unsafe'

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
      city: 'Campinas',
      district: values.district,
      line1: values.line1,
      location: {
        latitude: -22.8974,
        longitude: -47.051,
      },
      postalCode: values.postalCode,
      state: 'SP',
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
