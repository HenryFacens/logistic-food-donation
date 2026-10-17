import type { CreateDonationRequest } from '@resgata/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  buildDonationRequest,
  buildDonationPublishOperation,
  createStableIdempotencyRegistry,
  parseOptionalBrl,
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
  disposalCostBrl: 35,
  quantity: 20,
  unit: 'unit',
  unitValueBrl: 4.2,
} satisfies CreateDonationRequest

const formValues = {
  availableFrom: '2026-10-16T12:00',
  category: 'bakery',
  description: 'Pães do dia',
  district: 'Cambuí',
  disposalCostBrl: '',
  estimatedWeightKg: '4',
  expiresAt: '2026-10-16T18:00',
  line1: 'Rua Coronel Quirino, 900',
  perishabilityMinutes: '360',
  postalCode: '13025-001',
  quantity: '20',
  unit: 'unit',
  unitValueBrl: '',
} satisfies DonationFormValues

describe('donation publication', () => {
  it.each([
    ['', undefined],
    ['  ', undefined],
    ['0,00', 0],
    ['12,50', 12.5],
    ['12.50', 12.5],
    ['1.234', 1234],
    ['R$ 1.234,56', 1234.56],
    ['R$\u00a04.418,00', 4418],
  ])('parses optional pt-BR currency %s', (input, expected) => {
    expect(parseOptionalBrl(input)).toBe(expected)
  })

  it.each(['-1,00', '12,345', '1,2,3', 'R$ grátis'])(
    'rejects invalid currency %s',
    (input) => {
      expect(() => parseOptionalBrl(input)).toThrow('Invalid BRL value')
    },
  )

  it('omits empty optional financial values from the request', () => {
    const request = buildDonationRequest(formValues)

    expect(request).not.toHaveProperty('unitValueBrl')
    expect(request).not.toHaveProperty('disposalCostBrl')
  })

  it('adds normalized financial values to the request', () => {
    const request = buildDonationRequest({
      ...formValues,
      disposalCostBrl: 'R$ 35,00',
      unitValueBrl: '4,20',
    })

    expect(request).toMatchObject({
      disposalCostBrl: 35,
      unitValueBrl: 4.2,
    })
  })

  it('keeps one idempotency key for retries of the same payload', () => {
    const createKey = vi.fn(() => 'stable-key')
    const registry = createStableIdempotencyRegistry(createKey)

    expect(registry.keyFor(body)).toBe('stable-key')
    expect(registry.keyFor(body)).toBe('stable-key')
    expect(createKey).toHaveBeenCalledTimes(1)
  })

  it('publishes an attachable offline-safe operation', () => {
    expect(buildDonationPublishOperation(body, 'stable-key')).toMatchObject({
      body: {
        disposalCostBrl: 35,
        unitValueBrl: 4.2,
      },
      idempotencyKey: 'stable-key',
      kind: 'donation.publish',
      method: 'POST',
      path: '/donations',
    })
  })
})
