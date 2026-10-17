import type { CreateDonationRequest } from '@resgata/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  buildDonationPublishOperation,
  buildDonationRequest,
  createStableIdempotencyRegistry,
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

  it('uses the selected place coordinates and falls back to the demo point', () => {
    const values: DonationFormValues = {
      availableFrom: '2026-10-16T12:00',
      category: 'produce',
      city: 'Campinas',
      description: 'Bananas',
      district: 'Centro',
      estimatedWeightKg: '8',
      expiresAt: '2026-10-16T18:00',
      latitude: '',
      line1: 'Avenida Francisco Glicério, 650',
      longitude: '',
      perishabilityMinutes: '360',
      postalCode: '13012-100',
      quantity: '12',
      state: 'SP',
      unit: 'kg',
    }

    expect(buildDonationRequest(values).pickupAddress.location).toEqual({
      latitude: -22.8974,
      longitude: -47.051,
    })
    expect(
      buildDonationRequest({
        ...values,
        latitude: '-22.9071',
        longitude: '-47.0612',
      }).pickupAddress.location,
    ).toEqual({ latitude: -22.9071, longitude: -47.0612 })
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
