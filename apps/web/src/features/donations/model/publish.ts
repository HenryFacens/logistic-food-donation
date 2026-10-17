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
  disposalCostBrl: string
  estimatedWeightKg: string
  expiresAt: string
  line1: string
  perishabilityMinutes: string
  postalCode: string
  quantity: string
  unit: string
  unitValueBrl: string
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

export const parseOptionalBrl = (rawValue: string) => {
  const value = rawValue
    .trim()
    .replace(/\u00a0/gu, ' ')
    .replace(/^R\$\s*/iu, '')
    .replace(/\s+/gu, '')

  if (!value) return undefined
  if (!/^\d+(?:[.,]\d+)*$/u.test(value)) {
    throw new Error('Invalid BRL value')
  }

  let normalized: string
  if (value.includes(',')) {
    const ptBrCurrency =
      /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/u
    if (!ptBrCurrency.test(value)) {
      throw new Error('Invalid BRL value')
    }
    normalized = value.replace(/\./gu, '').replace(',', '.')
  } else if (/^\d{1,3}(?:\.\d{3})+$/u.test(value)) {
    normalized = value.replace(/\./gu, '')
  } else if (/^\d+(?:\.\d{1,2})?$/u.test(value)) {
    normalized = value
  } else {
    throw new Error('Invalid BRL value')
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid BRL value')
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export const buildDonationRequest = (
  values: DonationFormValues,
  classification?: Classification | null,
) => {
  const disposalCostBrl = parseOptionalBrl(values.disposalCostBrl)
  const unitValueBrl = parseOptionalBrl(values.unitValueBrl)

  return createDonationRequestSchema.parse({
    availableFrom: localDateToIso(values.availableFrom),
    category: values.category || classification?.category,
    classification: classification || undefined,
    description: values.description,
    ...(disposalCostBrl === undefined ? {} : { disposalCostBrl }),
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
    ...(unitValueBrl === undefined ? {} : { unitValueBrl }),
  })
}

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
