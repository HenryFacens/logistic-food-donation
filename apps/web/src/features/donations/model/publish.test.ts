import type { Classification, CreateDonationRequest } from '@resgata/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  applyClassification,
  buildDonationPublishOperation,
  createStableIdempotencyRegistry,
  isUnsafeClassification,
  type DonationFormValues,
} from './publish'

const body = {
  availableFrom: '2026-10-16T12:00:00.000Z',
  description: 'Pães do dia',
  estimatedWeightKg: 4,
  expiresAt: '2026-10-16T18:00:00.000Z',
  perishabilityMinutes: 360,
  pickupAddress: {
    city: 'Campinas',
    district: 'Cambuí',
    line1: 'Rua Coronel Quirino, 900',
    location: { latitude: -22.8974, longitude: -47.051 },
    postalCode: '13025-001',
    state: 'SP',
  },
  quantity: 20,
  unit: 'unit',
} satisfies CreateDonationRequest

describe('donation publication', () => {
  it('keeps one idempotency key for retries of the same payload', () => {
    const createKey = vi.fn(() => 'stable-key')
    const registry = createStableIdempotencyRegistry(createKey)

    expect(registry.keyFor(body)).toBe('stable-key')
    expect(registry.keyFor(body)).toBe('stable-key')
    expect(createKey).toHaveBeenCalledTimes(1)
  })

  it('publishes an attachable offline-safe operation', () => {
    expect(buildDonationPublishOperation(body, 'stable-key')).toMatchObject({
      idempotencyKey: 'stable-key',
      kind: 'donation.publish',
      method: 'POST',
      path: '/donations',
    })
  })
})

describe('applyClassification', () => {
  const values: DonationFormValues = {
    availableFrom: '2026-10-16T12:00',
    category: '',
    description: '',
    district: 'Cambuí',
    estimatedWeightKg: '5',
    expiresAt: '2026-10-16T18:00',
    line1: 'Rua Coronel Quirino, 900',
    perishabilityMinutes: '360',
    postalCode: '13025-001',
    quantity: '10',
    unit: 'unit',
  }
  const classification: Classification = {
    category: 'bakery',
    confidence: 0.9,
    description: 'Pães franceses do dia',
    estimatedWeightKg: 1.54,
    perishabilityMinutes: 240,
    simulated: false,
    source: 'camera',
    suggestedQuantity: 30,
    suggestedUnit: 'unit',
  }

  it('prefills amounts and sets the deadline from shelf life', () => {
    expect(applyClassification(values, classification)).toMatchObject({
      category: 'bakery',
      description: 'Pães franceses do dia',
      estimatedWeightKg: '1.5',
      expiresAt: '2026-10-16T16:00',
      perishabilityMinutes: '240',
      quantity: '30',
      unit: 'unit',
    })
  })

  it('keeps vendor amounts when the analysis has none', () => {
    const simulated: Classification = {
      category: 'bakery',
      confidence: 0.88,
      description: 'Pães — SIMULADO',
      perishabilityMinutes: 360,
      simulated: true,
      source: 'manual',
    }
    expect(applyClassification(values, simulated)).toMatchObject({
      description: 'Pães',
      estimatedWeightKg: '5',
      quantity: '10',
    })
  })

  it('flags unsafe food', () => {
    expect(isUnsafeClassification({ ...classification, condition: 'unsafe' })).toBe(true)
    expect(isUnsafeClassification(classification)).toBe(false)
  })
})
