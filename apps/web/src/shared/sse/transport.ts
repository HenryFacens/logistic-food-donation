import { ApiClientError, normalizeResponseError } from '../api'
import { SseDecoder, type ServerEvent } from './decoder'

export interface SseConnectionOptions {
  demoKey: string
  lastEventId?: string
  onEvent: (event: ServerEvent) => void
  onOpen?: () => void
  signal: AbortSignal
  url: string
}

export interface SseTransport {
  connect(options: SseConnectionOptions): Promise<void>
}

export const createFetchSseTransport = (
  fetcher: typeof fetch = fetch,
): SseTransport => ({
  async connect({ demoKey, lastEventId, onEvent, onOpen, signal, url }) {
    const headers = new Headers({
      Accept: 'text/event-stream',
      'X-Demo-User': demoKey,
    })
    if (lastEventId) headers.set('Last-Event-ID', lastEventId)

    const response = await fetcher(url, {
      cache: 'no-store',
      headers,
      signal,
    })
    if (!response.ok) throw await normalizeResponseError(response)
    if (!response.body) {
      throw new ApiClientError({
        kind: 'network',
        message: 'O navegador não conseguiu abrir as atualizações em tempo real.',
      })
    }

    onOpen?.()
    const decoder = new SseDecoder()
    const textDecoder = new TextDecoder()
    const reader = response.body.getReader()

    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break
      for (const event of decoder.push(textDecoder.decode(value, { stream: true }))) {
        onEvent(event)
      }
    }
  },
})

