import { describe, expect, it } from 'vitest'
import {
  createReplayIdempotencyKey,
  formatQueueAge,
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
})

