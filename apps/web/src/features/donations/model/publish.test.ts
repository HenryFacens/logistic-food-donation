import type { Classification, CreateDonationRequest } from '@resgata/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  applyAddress,
  applyClassification,
  buildDonationPublishOperation,
  buildDonationRequest,
  createStableIdempotencyRegistry,
  isUnsafeClassification,
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
  city: 'Campinas',
  description: 'Pães do dia',
  district: 'Cambuí',
  disposalCostBrl: '',
  estimatedWeightKg: '4',
  expiresAt: '2026-10-16T18:00',
  latitude: '-22.8974',
  line1: 'Rua Coronel Quirino, 900',
  longitude: '-47.051',
  perishabilityMinutes: '360',
  postalCode: '13025-001',
  quantity: '20',
  state: 'SP',
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

  it('uses the selected place coordinates and falls back to the demo point', () => {
    const values: DonationFormValues = {
      availableFrom: '2026-10-16T12:00',
      category: 'produce',
      city: 'Campinas',
      description: 'Bananas',
      disposalCostBrl: '',
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
      unitValueBrl: '',
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

describe('applyClassification', () => {
  const values: DonationFormValues = {
    availableFrom: '2026-10-16T12:00',
    category: '',
    city: 'Campinas',
    description: '',
    disposalCostBrl: '',
    district: 'Cambuí',
    estimatedWeightKg: '5',
    expiresAt: '2026-10-16T18:00',
    latitude: '-22.8974',
    line1: 'Rua Coronel Quirino, 900',
    longitude: '-47.051',
    perishabilityMinutes: '360',
    postalCode: '13025-001',
    quantity: '10',
    state: 'SP',
    unit: 'unit',
    unitValueBrl: '',
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

describe('pickup address', () => {
  it('uses the GPS or profile coordinates instead of a fixed point', () => {
    const values = applyAddress(
      {
        availableFrom: '2026-10-16T12:00',
        category: 'bakery',
        city: 'Campinas',
        description: 'Pães',
        disposalCostBrl: '',
        district: 'Cambuí',
        estimatedWeightKg: '2',
        expiresAt: '2026-10-16T18:00',
        latitude: '-22.8974',
        line1: 'Rua Coronel Quirino, 900',
        longitude: '-47.051',
        perishabilityMinutes: '360',
        postalCode: '13025-001',
        quantity: '10',
        state: 'SP',
        unit: 'unit',
        unitValueBrl: '',
      },
      {
        city: 'Valinhos',
        district: 'Centro',
        line1: 'Rua Treze de Maio, 10',
        location: { latitude: -22.97, longitude: -46.996 },
        postalCode: '13270-000',
        state: 'SP',
      },
    )
    expect(buildDonationRequest(values).pickupAddress).toMatchObject({
      city: 'Valinhos',
      location: { latitude: -22.97, longitude: -46.996 },
    })
  })
})
