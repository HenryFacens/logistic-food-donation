import type { Pickup } from '@resgata/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeliveryReceiptPanel } from './DeliveryReceiptPanel'

const pickup: Pickup = {
  assignedAt: '2026-10-17T12:00:00.000Z',
  collectedAt: '2026-10-17T12:20:00.000Z',
  createdAt: '2026-10-17T11:50:00.000Z',
  deliveredAt: '2026-10-17T12:45:00.000Z',
  deliveryCode: '482017',
  deliveryDueAt: '2026-10-17T13:00:00.000Z',
  deliveryLocation: { latitude: -22.9, longitude: -47.06 },
  donationDescription: '12 caixas de tomate',
  donationId: '11111111-1111-4111-8111-111111111111',
  driverId: '22222222-2222-4222-8222-222222222222',
  estimatedWeightKg: 180,
  id: '33333333-3333-4333-8333-333333333333',
  ngoId: '44444444-4444-4444-8444-444444444444',
  pickupCode: '123456',
  pickupLocation: { latitude: -22.89, longitude: -47.05 },
  receipt: null,
  status: 'delivered',
  updatedAt: '2026-10-17T12:45:00.000Z',
}

describe('delivery receipt panel', () => {
  it('prefills the real receipt form after delivery', () => {
    const markup = renderToStaticMarkup(
      <DeliveryReceiptPanel
        busy={false}
        onCreate={async () => {
          throw new Error('not called')
        }}
        pickup={pickup}
      />,
    )

    expect(markup).toContain('Confirmar recebimento')
    expect(markup).toContain('180')
    expect(markup).toContain('Confirmar recebimento')
  })

  it('renders an immutable proven summary after receipt creation', () => {
    const markup = renderToStaticMarkup(
      <DeliveryReceiptPanel
        busy={false}
        onCreate={async () => {
          throw new Error('not called')
        }}
        pickup={{
          ...pickup,
          receipt: {
            condition: 'partial',
            createdAt: '2026-10-17T12:50:00.000Z',
            id: '55555555-5555-4555-8555-555555555555',
            ngoId: pickup.ngoId,
            notes: 'Duas caixas com embalagem danificada.',
            photoUrl: null,
            pickupId: pickup.id,
            receivedWeightKg: 160,
            rejectedWeightKg: 20,
            rejectionReasons: ['Embalagem danificada'],
            simulated: false,
            simulationLabel: null,
            updatedAt: '2026-10-17T12:50:00.000Z',
          },
        }}
      />,
    )

    expect(markup).toContain('Conferido pela ONG')
    expect(markup).toContain('160 kg')
    expect(markup).toContain('Embalagem danificada')
    expect(markup).not.toContain('Confirmar recebimento')
  })
})
