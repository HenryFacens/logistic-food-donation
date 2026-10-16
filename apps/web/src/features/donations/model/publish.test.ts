import type { CreateDonationRequest } from '@resgata/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  buildDonationPublishOperation,
  createStableIdempotencyRegistry,
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
