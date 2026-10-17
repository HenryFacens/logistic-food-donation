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

  it('shows the API business message for conflicts', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'state_conflict',
            message: 'A oferta não está pendente.',
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
      message: 'A oferta não está pendente.',
      status: 409,
    })
  })

  it('keeps technical API messages out of the interface', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'validation_error', message: 'Requisição inválida.' },
        }),
        { status: 422 },
      ),
    )
    const client = createApiClient({
      baseUrl: '/api',
      fetcher,
      getDemoKey: () => null,
    })

    const error = await client.get('/donations').catch((caught) => caught)
    expect(error).toMatchObject({
      message: 'Confira os campos marcados e tente de novo.',
      status: 422,
    })
  })
})

