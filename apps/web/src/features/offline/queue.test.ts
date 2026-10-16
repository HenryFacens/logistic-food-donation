import type { CreateDonationRequest } from '@resgata/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  createOfflineDonationQueue,
  OfflineQueueConflictError,
} from './queue'
import type {
  OfflineDonationPublication,
  OfflineQueueStorage,
} from './types'

class MemoryStorage implements OfflineQueueStorage {
  readonly items = new Map<string, OfflineDonationPublication>()

  async add(item: OfflineDonationPublication) {
    if (this.items.has(item.idempotencyKey)) return false
    this.items.set(item.idempotencyKey, structuredClone(item))
    return true
  }

  async get(idempotencyKey: string) {
    return structuredClone(this.items.get(idempotencyKey))
  }

  async list() {
    return structuredClone([...this.items.values()])
  }

  async put(item: OfflineDonationPublication) {
    this.items.set(item.idempotencyKey, structuredClone(item))
  }
}

const requestBody = (description: string): CreateDonationRequest => ({
  availableFrom: '2026-10-16T15:00:00-03:00',
  category: 'bakery',
  description,
  estimatedWeightKg: 8,
  expiresAt: '2026-10-16T18:00:00-03:00',
  perishabilityMinutes: 180,
  pickupAddress: {
    city: 'Campinas',
    district: 'Cambuí',
    line1: 'Rua Coronel Quirino, 100',
    location: {
      latitude: -22.8994,
      longitude: -47.0517,
    },
    postalCode: '13025-001',
    state: 'SP',
  },
  quantity: 20,
  unit: 'unit',
})

describe('offline donation queue', () => {
  it('preserves the original idempotency key, body and demo user', async () => {
    const storage = new MemoryStorage()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 'donation-1' }), { status: 201 }),
    )
    const queue = createOfflineDonationQueue({
      fetcher,
      now: () => new Date('2026-10-16T18:10:00.000Z'),
      storage,
    })
    const body = requestBody('Pães e salgados')

    await queue.enqueue({
      correlationId: 'correlation-offline-1',
      demoUser: 'seller-padaria-cambui',
      idempotencyKey: 'idempotency-offline-1',
      requestBody: body,
    })
    await queue.synchronize()

    const [url, request] = fetcher.mock.calls[0]
    const headers = new Headers(request?.headers)
    expect(url).toBe('/api/donations')
    expect(headers.get('Idempotency-Key')).toBe('idempotency-offline-1')
    expect(headers.get('X-Demo-User')).toBe('seller-padaria-cambui')
    expect(headers.get('X-Correlation-Id')).toBe('correlation-offline-1')
    expect(JSON.parse(String(request?.body))).toEqual(body)

    const stored = await queue.get('idempotency-offline-1')
    expect(stored).toMatchObject({
      demoUser: 'seller-padaria-cambui',
      idempotencyKey: 'idempotency-offline-1',
      requestBody: body,
      status: 'succeeded',
    })

    await expect(
      queue.enqueue({
        demoUser: 'seller-padaria-cambui',
        idempotencyKey: 'idempotency-offline-1',
        requestBody: body,
      }),
    ).resolves.toMatchObject({ status: 'succeeded' })
    await expect(
      queue.enqueue({
        demoUser: 'seller-padaria-cambui',
        idempotencyKey: 'idempotency-offline-1',
        requestBody: requestBody('Outro conteúdo'),
      }),
    ).rejects.toBeInstanceOf(OfflineQueueConflictError)

    await queue.synchronize()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('replays publications sequentially in enqueue order', async () => {
    const storage = new MemoryStorage()
    let activeRequests = 0
    let maximumConcurrency = 0
    const replayedDescriptions: string[] = []
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      async (_url, request) => {
        activeRequests += 1
        maximumConcurrency = Math.max(maximumConcurrency, activeRequests)
        replayedDescriptions.push(
          JSON.parse(String(request?.body)).description as string,
        )
        await Promise.resolve()
        activeRequests -= 1
        return new Response('{}', { status: 201 })
      },
    )
    let timestamp = Date.parse('2026-10-16T18:00:00.000Z')
    const queue = createOfflineDonationQueue({
      fetcher,
      now: () => new Date(timestamp),
      storage,
    })

    await queue.enqueue({
      demoUser: 'seller-padaria-cambui',
      idempotencyKey: 'idempotency-first',
      requestBody: requestBody('Primeira publicação'),
    })
    timestamp += 1_000
    await queue.enqueue({
      demoUser: 'seller-mercado-taquaral',
      idempotencyKey: 'idempotency-second',
      requestBody: requestBody('Segunda publicação'),
    })
    timestamp += 1_000

    await queue.synchronize()

    expect(replayedDescriptions).toEqual([
      'Primeira publicação',
      'Segunda publicação',
    ])
    expect(maximumConcurrency).toBe(1)
  })

  it('retries temporary failures and retains permanent failures without replaying them', async () => {
    const storage = new MemoryStorage()
    const attempts = new Map<string, number>()
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      async (_url, request) => {
        const headers = new Headers(request?.headers)
        const key = String(headers.get('Idempotency-Key'))
        const attempt = (attempts.get(key) ?? 0) + 1
        attempts.set(key, attempt)

        if (key === 'idempotency-retry' && attempt === 1) {
          return new Response(
            JSON.stringify({ error: { message: 'Serviço indisponível.' } }),
            { status: 503 },
          )
        }
        if (key === 'idempotency-permanent') {
          return new Response(
            JSON.stringify({ error: { message: 'Dados inválidos.' } }),
            { status: 422 },
          )
        }
        return new Response('{}', { status: 201 })
      },
    )
    let timestamp = Date.parse('2026-10-16T18:00:00.000Z')
    const queue = createOfflineDonationQueue({
      fetcher,
      now: () => new Date(timestamp),
      retryDelayMs: () => 0,
      storage,
    })

    await queue.enqueue({
      demoUser: 'seller-padaria-cambui',
      idempotencyKey: 'idempotency-retry',
      requestBody: requestBody('Falha temporária'),
    })
    timestamp += 1_000
    await queue.enqueue({
      demoUser: 'seller-padaria-cambui',
      idempotencyKey: 'idempotency-permanent',
      requestBody: requestBody('Falha permanente'),
    })
    timestamp += 1_000

    await queue.synchronize()

    expect(await queue.get('idempotency-retry')).toMatchObject({
      retry: {
        attemptCount: 1,
        failureKind: 'retryable',
        lastStatusCode: 503,
      },
      status: 'retryable_failure',
      statusText:
        'Falha temporária. Uma nova tentativa será feita automaticamente.',
    })
    expect(await queue.get('idempotency-permanent')).toMatchObject({
      retry: {
        attemptCount: 1,
        failureKind: 'permanent',
        lastStatusCode: 422,
      },
      status: 'permanent_failure',
      statusText:
        'Não foi possível publicar. Revise os dados antes de tentar novamente.',
    })

    await queue.synchronize()
    await queue.synchronize()

    expect(attempts.get('idempotency-retry')).toBe(2)
    expect(attempts.get('idempotency-permanent')).toBe(1)
    expect(await queue.get('idempotency-retry')).toMatchObject({
      status: 'succeeded',
    })
  })
})
