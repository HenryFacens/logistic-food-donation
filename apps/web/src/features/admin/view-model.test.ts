import { describe, expect, it } from 'vitest'
import {
  buildQueueHealth,
  collectPlatformEvidence,
  createReplayIdempotencyKey,
  formatQueueAge,
  formatPlatformDashboardPeriod,
  summarizeQueues,
} from './view-model'

describe('admin view model', () => {
  it('sums queue states into operational totals', () => {
    expect(
      summarizeQueues([
        {
          deadLetter: 2,
          name: 'donation.created',
          oldestMessageAt: null,
          processing: 1,
          ready: 3,
          scheduled: 4,
        },
        {
          deadLetter: 1,
          name: 'offer.sent',
          oldestMessageAt: null,
          processing: 2,
          ready: 5,
          scheduled: 6,
        },
      ]),
    ).toEqual({ deadLetter: 3, inFlight: 3, pending: 18 })
  })

  it('creates a stable order-independent replay idempotency key', () => {
    const first = createReplayIdempotencyKey(['message-b', 'message-a'])
    const second = createReplayIdempotencyKey(['message-a', 'message-b'])

    expect(first).toBe(second)
    expect(first).toMatch(/^admin-replay-[a-f0-9]{8}$/)
  })

  it('formats empty and elapsed queue age', () => {
    const now = Date.parse('2026-10-16T12:00:00Z')
    expect(formatQueueAge(null, now)).toBe('Sem mensagens')
    expect(formatQueueAge('2026-10-16T11:45:00Z', now)).toBe('Há 15 min')
    expect(formatQueueAge('2026-10-14T12:00:00Z', now)).toBe('Há 2 d')
  })

  it('derives operational health only from current queue values', () => {
    expect(
      buildQueueHealth([
        {
          deadLetter: 0,
          name: 'donation.created',
          oldestMessageAt: null,
          processing: 2,
          ready: 4,
          scheduled: 0,
        },
        {
          deadLetter: 3,
          name: 'offer.sent',
          oldestMessageAt: null,
          processing: 1,
          ready: 0,
          scheduled: 0,
        },
      ]),
    ).toEqual({
      activity: [
        {
          key: 'pending',
          label: 'Pendentes ou agendadas',
          value: 4,
          width: 100,
        },
        {
          key: 'in-flight',
          label: 'Em processamento',
          value: 3,
          width: 75,
        },
        {
          key: 'dead-letter',
          label: 'Dead-letter',
          value: 3,
          width: 75,
        },
      ],
      healthRate: 50,
      healthyQueues: 1,
      totalQueues: 2,
      totalVisibleMessages: 10,
    })
  })

  it('keeps dashboard evidence ordered without upgrading estimates', () => {
    expect(
      collectPlatformEvidence([
        {
          key: 'operation',
          title: 'Operação',
          metrics: [
            {
              key: 'matching',
              label: 'Matching',
              evidence: 'calculated',
              value: 82,
              unit: '%',
            },
            {
              key: 'cost',
              label: 'Custo',
              evidence: 'unavailable',
              value: null,
              unit: 'BRL',
            },
            {
              key: 'forecast',
              label: 'Previsão',
              evidence: 'estimated',
              value: 90,
              unit: '%',
            },
          ],
          monthlySeries: [],
        },
      ]),
    ).toEqual(['calculated', 'estimated', 'unavailable'])
  })

  it('formats the platform dashboard period in pt-BR', () => {
    expect(
      formatPlatformDashboardPeriod(
        '2026-07-19T00:00:00.000Z',
        '2026-10-17T00:00:00.000Z',
      ),
    ).toBe('19 de jul. de 2026 a 17 de out. de 2026')
  })
})
