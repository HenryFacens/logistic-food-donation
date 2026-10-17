import { describe, expect, it } from 'vitest'
import type { Pickup } from '@resgata/shared'
import {
  acceptOutcomeMessage,
  acceptOutcomeTone,
  capacityCheck,
  formatRemaining,
  mapPickupConfirmation,
  nextPickupAction,
  deliveryDeadline,
  displayDescription,
  formatItem,
  pickupUrgency,
  selectionSummaryLabel,
  selectionTotals,
  sortAvailablePickups,
  splitDriverPickups,
} from './viewModels'

const pickup = {
  deliveryLocation: { latitude: -22.9, longitude: -47.06 },
  pickupLocation: { latitude: -22.89, longitude: -47.05 },
}

describe('pickup confirmation mapping', () => {
  it('normalizes the code and uses browser coordinates', () => {
    expect(
      mapPickupConfirmation({
        action: 'collect',
        code: '12-34 56 extra',
        currentLocation: { latitude: -22.8, longitude: -47.1 },
        pickup,
      }),
    ).toEqual({
      code: '123456',
      location: { latitude: -22.8, longitude: -47.1 },
    })
  })

  it('falls back to the action target when GPS is unavailable', () => {
    expect(
      mapPickupConfirmation({
        action: 'deliver',
        code: '654321',
        currentLocation: null,
        pickup,
      }),
    ).toEqual({
      code: '654321',
      location: pickup.deliveryLocation,
    })
  })

  it('maps pickup states to the next allowed field action', () => {
    expect(nextPickupAction({ driverId: null, status: 'awaiting_driver' })).toBe('assign')
    expect(nextPickupAction({ driverId: 'driver', status: 'assigned' })).toBe('collect')
    expect(nextPickupAction({ driverId: 'driver', status: 'collected' })).toBe('deliver')
    expect(nextPickupAction({ driverId: 'driver', status: 'delivered' })).toBeNull()
  })
})

const NOW = Date.parse('2026-10-16T12:00:00Z')
const address = {
  city: 'Campinas' as const,
  district: 'Cambuí',
  line1: 'Rua Coronel Quirino, 900',
  location: { latitude: -22.89, longitude: -47.05 },
  postalCode: '13025-001',
  state: 'SP' as const,
}

const buildPickup = (
  id: string,
  overrides: Partial<Pickup> = {},
  summary: Partial<NonNullable<Pickup['summary']>> = {},
): Pickup => ({
  assignedAt: null,
  collectedAt: null,
  createdAt: '2026-10-16T11:00:00Z',
  deliveredAt: null,
  deliveryLocation: pickup.deliveryLocation,
  donationId: id,
  driverId: null,
  id,
  ngoId: 'ngo',
  pickupLocation: pickup.pickupLocation,
  status: 'awaiting_driver',
  updatedAt: '2026-10-16T11:00:00Z',
  summary: {
    category: 'bakery',
    deliveryAddress: address,
    description: 'SIMULADO',
    distanceToPickupKm: 2,
    estimatedWeightKg: 10,
    deliverBy: '2026-10-16T16:00:00Z',
    expiresAt: '2026-10-16T15:00:00Z',
    items: [],
    ngoName: 'ONG',
    pickupAddress: address,
    quantity: 10,
    rewardPoints: 45,
    routeDistanceKm: 3,
    sellerName: 'Doador',
    unit: 'kg',
    ...summary,
  },
  ...overrides,
})

describe('driver deliveries view model', () => {
  it('splits available, own active, and completed pickups', () => {
    const items = [
      buildPickup('a'),
      buildPickup('b', { driverId: 'me', status: 'assigned' }),
      buildPickup('c', { driverId: 'me', status: 'collected' }),
      buildPickup('d', { driverId: 'other', status: 'assigned' }),
      buildPickup('e', { driverId: 'me', status: 'delivered' }),
    ]
    const split = splitDriverPickups(items, 'me')
    expect(split.available.map((item) => item.id)).toEqual(['a'])
    expect(split.active.map((item) => item.id)).toEqual(['b', 'c'])
    expect(split.completed.map((item) => item.id)).toEqual(['e'])
  })

  it('labels urgency below two hours and one hour', () => {
    const at = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString()
    expect(pickupUrgency(at(45), NOW)).toEqual({ label: 'Vence em 45 min', tone: 'danger' })
    expect(pickupUrgency(at(80), NOW)).toEqual({ label: 'Vence em 1h20', tone: 'warning' })
    expect(pickupUrgency(at(180), NOW)).toEqual({ label: 'Vence em 3h', tone: null })
    expect(pickupUrgency(at(-1), NOW)).toEqual({ label: 'Vencida', tone: 'danger' })
    expect(formatRemaining(61 * 60_000)).toBe('1h01')
  })

  it('labels the delivery deadline with its clock time and tone', () => {
    const at = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString()
    expect(deliveryDeadline(at(45), NOW)?.tone).toBe('danger')
    expect(deliveryDeadline(at(90), NOW)?.tone).toBe('warning')
    expect(deliveryDeadline(at(180), NOW)?.label).toMatch(/^Entregar até \d{2}:\d{2}$/)
    expect(deliveryDeadline(at(-1), NOW)).toEqual({ label: 'Prazo de entrega vencido', tone: 'danger' })
    expect(deliveryDeadline(undefined, NOW)).toBeNull()
  })

  it('formats itemized loads and strips the SIMULADO prefix', () => {
    expect(formatItem({ name: 'Bananas', quantity: 1, unit: 'kg' })).toBe('Bananas – 1 kg')
    expect(formatItem({ name: 'Bolos', quantity: 1.5, unit: 'tray' })).toBe('Bolos – 1,5 bandejas')
    expect(formatItem({ name: 'Cestas', quantity: 1, unit: 'box' })).toBe('Cestas – 1 caixa')
    expect(displayDescription('SIMULADO - frutas e verduras da feira')).toBe('Frutas e verduras da feira')
  })

  it('sorts by urgency by default and by distance on demand', () => {
    const items = [
      buildPickup('late-near', {}, { distanceToPickupKm: 1, expiresAt: '2026-10-16T18:00:00Z' }),
      buildPickup('soon-far', {}, { distanceToPickupKm: 9, expiresAt: '2026-10-16T12:40:00Z' }),
      buildPickup('mid', {}, { distanceToPickupKm: 4, expiresAt: '2026-10-16T14:00:00Z' }),
    ]
    expect(sortAvailablePickups(items, 'urgency').map((item) => item.id)).toEqual([
      'soon-far',
      'mid',
      'late-near',
    ])
    expect(sortAvailablePickups(items, 'nearest').map((item) => item.id)).toEqual([
      'late-near',
      'mid',
      'soon-far',
    ])
  })

  it('totals the selection and validates vehicle capacity', () => {
    const totals = selectionTotals([
      buildPickup('a', {}, { estimatedWeightKg: 18, rewardPoints: 53 }),
      buildPickup('b', {}, { estimatedWeightKg: 12.5, rewardPoints: 48 }),
      buildPickup('c', {}, { estimatedWeightKg: 11.5, rewardPoints: 47 }),
    ])
    expect(totals).toEqual({ count: 3, points: 148, weightKg: 42 })
    expect(selectionSummaryLabel(totals)).toBe('3 entregas · 42 kg · +148 pts')
    expect(capacityCheck(42, 350)).toEqual({ exceeds: false, message: null })
    expect(capacityCheck(380, 350)).toEqual({
      exceeds: true,
      message: 'Excede a capacidade do veículo (350 kg)',
    })
    expect(capacityCheck(380, undefined).exceeds).toBe(false)
  })

  it('summarizes partial acceptance', () => {
    const outcome = {
      accepted: ['a', 'b'],
      failed: [],
      taken: ['c'],
    }
    expect(acceptOutcomeMessage(outcome)).toBe('2 aceitas · 1 já foi pega por outro motorista')
    expect(acceptOutcomeTone(outcome)).toBe('info')
    expect(acceptOutcomeTone({ accepted: ['a'], failed: [], taken: [] })).toBe('success')
    expect(acceptOutcomeTone({ accepted: [], failed: [{ id: 'x', message: 'erro' }], taken: [] })).toBe('danger')
  })
})
