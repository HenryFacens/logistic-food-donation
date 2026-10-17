import { normalizeResponseError, normalizeUnknownError } from './errors'

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: BodyInit | object
  correlationId?: string
  headers?: HeadersInit
  idempotencyKey?: string
}

export interface ApiClient {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T>
  post<T>(
    path: string,
    body?: ApiRequestOptions['body'],
    options?: ApiRequestOptions,
  ): Promise<T>
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>
}

interface CreateApiClientOptions {
  baseUrl: string
  fetcher?: typeof fetch
  getDemoKey: () => string | null
  getAuthToken?: () => string | null
  /** Called when the server rejects the bearer session. */
  onUnauthorized?: () => void
}

const isJsonBody = (body: ApiRequestOptions['body']): body is object =>
  Boolean(body) &&
  typeof body === 'object' &&
  !(body instanceof Blob) &&
  !(body instanceof FormData) &&
  !(body instanceof URLSearchParams) &&
  !(body instanceof ArrayBuffer)

const joinUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

export const createApiClient = ({
  baseUrl,
  fetcher = fetch,
  getDemoKey,
  getAuthToken = () => null,
  onUnauthorized,
}: CreateApiClientOptions): ApiClient => {
  const request = async <T,>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> => {
    const {
      body,
      correlationId,
      headers: customHeaders,
      idempotencyKey,
      ...requestInit
    } = options
    const headers = new Headers(customHeaders)
    const demoKey = getDemoKey()
    const authToken = getAuthToken()

    headers.set('Accept', 'application/json')
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
    else if (demoKey) headers.set('X-Demo-User', demoKey)
    if (correlationId) headers.set('X-Correlation-Id', correlationId)
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

    const normalizedBody = isJsonBody(body) ? JSON.stringify(body) : body
    if (isJsonBody(body)) headers.set('Content-Type', 'application/json')

    try {
      const response = await fetcher(joinUrl(baseUrl, path), {
        ...requestInit,
        body: normalizedBody,
        headers,
      })
      if (response.status === 401 && authToken) onUnauthorized?.()
      if (!response.ok) throw await normalizeResponseError(response)
      if (response.status === 204) return undefined as T
      return (await response.json()) as T
    } catch (error) {
      throw normalizeUnknownError(error)
    }
  }

  return {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) =>
      request(path, { ...options, body, method: 'POST' }),
    request,
  }
}

export const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `resgata-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

