import {
  type Address,
  createDonationRequestSchema,
  type Classification,
  type CreateDonationRequest,
  type Donation,
} from '@resgata/shared'

export interface DonationFormValues {
  category: string
  city: string
  description: string
  district: string
  disposalCostBrl: string
  estimatedWeightKg: string
  /** Pickup window from publication, in minutes (preset chips). */
  expiryMinutes: string
  /** Custom pickup deadline as a clock time "HH:MM"; wins over minutes. */
  expiryTime: string
  latitude: string
  line1: string
  longitude: string
  perishabilityMinutes: string
  postalCode: string
  quantity: string
  state: string
  unit: string
  unitValueBrl: string
}

/** Pickup address fields taken from a profile, CEP lookup, or GPS. */
export const applyAddress = (
  values: DonationFormValues,
  address: Address,
): DonationFormValues => ({
  ...values,
  city: address.city,
  district: address.district,
  latitude: String(address.location.latitude),
  line1: address.line1,
  longitude: String(address.location.longitude),
  postalCode: address.postalCode,
  state: address.state,
})

// Used only when no profile, GPS, CEP, or map suggestion supplied coordinates.
const demoPickupLocation = { latitude: -22.8974, longitude: -47.051 }

const selectedLocation = (values: DonationFormValues) => {
  const latitude = Number(values.latitude)
  const longitude = Number(values.longitude)
  return values.latitude.trim() &&
    values.longitude.trim() &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
    ? { latitude, longitude }
    : demoPickupLocation
}

export const addressFromValues = (values: DonationFormValues): Address => ({
  city: values.city || 'Campinas',
  district: values.district,
  line1: values.line1,
  location: selectedLocation(values),
  postalCode: values.postalCode,
  state: values.state || 'SP',
})

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

export const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const formatAmount = (value: number) => String(Math.round(value * 10) / 10)

export const formatBrl = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)

/** Form fields an image analysis can fill (shown with an "IA" tag). */
export type AiFilledField =
  | 'category'
  | 'description'
  | 'disposalCostBrl'
  | 'estimatedWeightKg'
  | 'perishabilityMinutes'
  | 'quantity'
  | 'unit'
  | 'unitValueBrl'

/** Prefills the vendor form from an image analysis; returns what it filled. */
export const applyClassification = (
  values: DonationFormValues,
  classification: Classification,
): { values: DonationFormValues; filled: AiFilledField[] } => {
  const next: DonationFormValues = {
    ...values,
    category: classification.category,
    description: classification.description.replace(/\s+—\s+SIMULADO$/u, ''),
    perishabilityMinutes: String(classification.perishabilityMinutes),
  }
  const filled: AiFilledField[] = ['category', 'description', 'perishabilityMinutes']
  if (classification.suggestedQuantity) {
    next.quantity = formatAmount(classification.suggestedQuantity)
    filled.push('quantity')
  }
  if (classification.suggestedUnit) {
    next.unit = classification.suggestedUnit
    filled.push('unit')
  }
  if (classification.estimatedWeightKg) {
    next.estimatedWeightKg = formatAmount(classification.estimatedWeightKg)
    filled.push('estimatedWeightKg')
  } else if (next.unit === 'kg') {
    next.estimatedWeightKg = next.quantity
  }
  if (classification.estimatedValuePerKgBrl) {
    next.unitValueBrl = formatBrl(classification.estimatedValuePerKgBrl)
    filled.push('unitValueBrl')
  }
  if (classification.estimatedDisposalCostBrl) {
    next.disposalCostBrl = formatBrl(classification.estimatedDisposalCostBrl)
    filled.push('disposalCostBrl')
  }
  return { values: next, filled }
}

/**
 * Keeps quantity and weight coherent: in kg they are the same number;
 * otherwise the weight follows the quantity at a constant weight per item.
 */
export const rescaleWeight = (
  values: DonationFormValues,
  nextQuantity: string,
): string => {
  if (values.unit === 'kg') return nextQuantity
  const quantity = Number(values.quantity)
  const weight = Number(values.estimatedWeightKg)
  const next = Number(nextQuantity)
  if (!(quantity > 0) || !(weight > 0) || !(next > 0)) return values.estimatedWeightKg
  return formatAmount(Math.max(0.1, (weight / quantity) * next))
}

/** Next occurrence of a clock time "HH:MM" after `now` (today or tomorrow). */
const nextClockTime = (time: string, now: Date) => {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(now)
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 1)
  return date
}

/**
 * The pickup window: available now, until the chosen time, but never beyond
 * the food's estimated shelf life (`capped` tells the vendor we shortened it).
 */
export const resolvePickupWindow = (values: DonationFormValues, now = new Date()) => {
  const chosen = values.expiryTime
    ? nextClockTime(values.expiryTime, now)
    : new Date(now.getTime() + (Number(values.expiryMinutes) || 120) * 60_000)
  const shelfLife = Number(values.perishabilityMinutes)
  const safeUntil =
    shelfLife > 0 ? new Date(now.getTime() + shelfLife * 60_000) : null
  const capped = safeUntil !== null && safeUntil < chosen
  return {
    availableFrom: now,
    expiresAt: capped ? safeUntil : chosen,
    capped,
  }
}

export const isUnsafeClassification = (
  classification?: Classification | null,
) => classification?.condition === 'unsafe'

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
  now = new Date(),
) => {
  const disposalCostBrl = parseOptionalBrl(values.disposalCostBrl)
  const unitValueBrl = parseOptionalBrl(values.unitValueBrl)
  const window = resolvePickupWindow(values, now)

  return createDonationRequestSchema.parse({
    availableFrom: window.availableFrom.toISOString(),
    category: values.category || classification?.category,
    classification: classification || undefined,
    description: values.description,
    ...(disposalCostBrl === undefined ? {} : { disposalCostBrl }),
    estimatedWeightKg: Number(values.estimatedWeightKg),
    expiresAt: window.expiresAt.toISOString(),
    perishabilityMinutes: Number(values.perishabilityMinutes),
    pickupAddress: addressFromValues(values),
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
