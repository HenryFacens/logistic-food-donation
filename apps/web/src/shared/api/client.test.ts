import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { ApiClientError } from './errors'

describe('createApiClient', () => {
  it('adds demo, correlation and idempotency headers', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      }),
    )
    const client = createApiClient({
      baseUrl: '/api/',
      fetcher,
      getDemoKey: () => 'seller-padaria-cambui',
    })

    await client.post(
      '/donations',
      { description: 'Pães' },
      {
        correlationId: 'correlation-123',
        idempotencyKey: 'idempotency-123',
      },
    )

    const [url, request] = fetcher.mock.calls[0]
    const headers = new Headers(request?.headers)
    expect(url).toBe('/api/donations')
    expect(headers.get('X-Demo-User')).toBe('seller-padaria-cambui')
    expect(headers.get('X-Correlation-Id')).toBe('correlation-123')
    expect(headers.get('Idempotency-Key')).toBe('idempotency-123')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('normalizes API conflicts to pt-BR', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'state_conflict',
            message: 'internal message',
            correlationId: 'correlation-123',
          },
        }),
        { status: 409 },
      ),
    )
    const client = createApiClient({
      baseUrl: '/api',
      fetcher,
      getDemoKey: () => null,
    })

    const error = await client.get('/donations').catch((caught) => caught)
    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      code: 'state_conflict',
      correlationId: 'correlation-123',
      kind: 'conflict',
      message: 'Os dados mudaram. Atualize a tela e tente novamente.',
      status: 409,
    })
  })
})

