import { IndexedDbOfflineQueueStorage } from './storage'
import {
  OFFLINE_STATUS_TEXT,
  type EnqueueDonationPublicationInput,
  type OfflineDonationPublication,
  type OfflineDonationQueue,
  type OfflineFailureKind,
  type OfflineQueueSnapshot,
  type OfflineQueueStorage,
} from './types'

const DEFAULT_ENDPOINT = '/api/donations'
const BASE_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 5 * 60_000

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export interface CreateOfflineDonationQueueOptions {
  fetcher?: Fetcher
  isOnline?: () => boolean
  now?: () => Date
  retryDelayMs?: (attemptCount: number, response?: Response) => number
  storage?: OfflineQueueStorage
}

export class OfflineQueueConflictError extends Error {
  constructor(idempotencyKey: string) {
    super(
      `A chave idempotente ${idempotencyKey} já pertence a outra publicação.`,
    )
    this.name = 'OfflineQueueConflictError'
  }
}

const createCorrelationId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `resgata-offline-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const defaultRetryDelayMs = (attemptCount: number, response?: Response) => {
  const retryAfter = response?.headers.get('Retry-After')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000

    const retryDate = Date.parse(retryAfter)
    if (Number.isFinite(retryDate)) {
      return Math.max(0, retryDate - Date.now())
    }
  }
  return Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attemptCount - 1),
  )
}

const isRetryableStatus = (status: number) =>
  status === 408 ||
  status === 425 ||
  status === 429 ||
  (status >= 500 && status <= 599)

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entry]) =>
          `${JSON.stringify(key)}:${canonicalJson(entry)}`,
      )
      .join(',')}}`
  }
  return JSON.stringify(value)
}

const samePublication = (
  existing: OfflineDonationPublication,
  input: EnqueueDonationPublicationInput,
) =>
  existing.demoUser === input.demoUser &&
  existing.endpoint === (input.endpoint ?? DEFAULT_ENDPOINT) &&
  canonicalJson(existing.requestBody) === canonicalJson(input.requestBody)

const sortPublications = (
  left: OfflineDonationPublication,
  right: OfflineDonationPublication,
) =>
  left.enqueuedAt.localeCompare(right.enqueuedAt) ||
  left.idempotencyKey.localeCompare(right.idempotencyKey)

const isActionable = (item: OfflineDonationPublication) =>
  item.status === 'pending' || item.status === 'retryable_failure'

const isDue = (item: OfflineDonationPublication, now: Date) =>
  isActionable(item) &&
  (!item.retry.nextAttemptAt ||
    new Date(item.retry.nextAttemptAt).getTime() <= now.getTime())

const errorMessageFrom = async (response: Response) => {
  try {
    const body = (await response.clone().json()) as {
      error?: { message?: unknown }
    }
    return typeof body.error?.message === 'string'
      ? body.error.message
      : `A API respondeu com HTTP ${response.status}.`
  } catch {
    return `A API respondeu com HTTP ${response.status}.`
  }
}

const changedSnapshot = (
  previous: OfflineQueueSnapshot,
  next: OfflineQueueSnapshot,
) =>
  previous.lastSyncedAt !== next.lastSyncedAt ||
  previous.pendingCount !== next.pendingCount ||
  previous.syncing !== next.syncing

export const createOfflineDonationQueue = ({
  fetcher = (input, init) => globalThis.fetch(input, init),
  isOnline = () => {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.onLine !== 'boolean'
    ) {
      return true
    }
    return navigator.onLine
  },
  now = () => new Date(),
  retryDelayMs = defaultRetryDelayMs,
  storage = new IndexedDbOfflineQueueStorage(),
}: CreateOfflineDonationQueueOptions = {}): OfflineDonationQueue => {
  const listeners = new Set<() => void>()
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let synchronizePromise: Promise<void> | null = null
  let snapshot: OfflineQueueSnapshot = {
    lastSyncedAt: null,
    pendingCount: 0,
    syncing: false,
  }

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  const replaceSnapshot = (next: OfflineQueueSnapshot) => {
    if (!changedSnapshot(snapshot, next)) return
    snapshot = next
    emit()
  }

  const scheduleRetry = (items: OfflineDonationPublication[]) => {
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = undefined

    const nextAttempt = items
      .filter(isActionable)
      .map((item) => item.retry.nextAttemptAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right)[0]

    if (nextAttempt === undefined) return
    const delay = Math.max(0, nextAttempt - now().getTime())
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      void queue.synchronize()
    }, delay)
  }

  const refreshSnapshot = async (syncing = snapshot.syncing) => {
    const items = await storage.list()
    const completedAt = items
      .map((item) => item.completedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)

    replaceSnapshot({
      lastSyncedAt: completedAt ?? null,
      pendingCount: items.filter(isActionable).length,
      syncing,
    })
    scheduleRetry(items)
    return items
  }

  const markFailure = async (
    item: OfflineDonationPublication,
    failureKind: OfflineFailureKind,
    error: string,
    statusCode: number | null,
    response?: Response,
  ) => {
    const attemptedAt = now()
    const attemptCount = item.retry.attemptCount + 1
    const retryable = failureKind === 'retryable'
    const nextAttemptAt = retryable
      ? new Date(
          attemptedAt.getTime() + retryDelayMs(attemptCount, response),
        ).toISOString()
      : null
    const failed: OfflineDonationPublication = {
      ...item,
      retry: {
        attemptCount,
        failureKind,
        lastAttemptAt: attemptedAt.toISOString(),
        lastError: error,
        lastStatusCode: statusCode,
        nextAttemptAt,
      },
      status: retryable ? 'retryable_failure' : 'permanent_failure',
      statusText: retryable
        ? OFFLINE_STATUS_TEXT.retryable_failure
        : OFFLINE_STATUS_TEXT.permanent_failure,
      updatedAt: attemptedAt.toISOString(),
    }
    await storage.put(failed)
  }

  const replay = async (item: OfflineDonationPublication) => {
    let response: Response
    try {
      response = await fetcher(item.endpoint, {
        body: JSON.stringify(item.requestBody),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Idempotency-Key': item.idempotencyKey,
          'X-Correlation-Id': item.correlationId,
          'X-Demo-User': item.demoUser,
        },
        method: 'POST',
      })
    } catch (error) {
      await markFailure(
        item,
        'retryable',
        error instanceof Error
          ? error.message
          : 'Falha de rede ao publicar a doação.',
        null,
      )
      return
    }

    if (!response.ok) {
      await markFailure(
        item,
        isRetryableStatus(response.status) ? 'retryable' : 'permanent',
        await errorMessageFrom(response),
        response.status,
        response,
      )
      return
    }

    const completedAt = now().toISOString()
    await storage.put({
      ...item,
      completedAt,
      retry: {
        ...item.retry,
        attemptCount: item.retry.attemptCount + 1,
        failureKind: null,
        lastAttemptAt: completedAt,
        lastError: null,
        lastStatusCode: response.status,
        nextAttemptAt: null,
      },
      status: 'succeeded',
      statusText: OFFLINE_STATUS_TEXT.succeeded,
      updatedAt: completedAt,
    })
  }

  const synchronize = () => {
    if (synchronizePromise) return synchronizePromise
    if (!isOnline()) return Promise.resolve()

    synchronizePromise = (async () => {
      const items = (await storage.list())
        .filter((item) => isDue(item, now()))
        .sort(sortPublications)
      if (items.length === 0) {
        scheduleRetry(await storage.list())
        return
      }

      replaceSnapshot({ ...snapshot, syncing: true })
      try {
        for (const item of items) {
          const current = await storage.get(item.idempotencyKey)
          if (!current || !isDue(current, now())) continue
          await replay(current)
        }
      } finally {
        await refreshSnapshot(false)
      }
    })().finally(() => {
      synchronizePromise = null
    })
    return synchronizePromise
  }

  const queue: OfflineDonationQueue = {
    enqueue: async (input) => {
      const idempotencyKey = input.idempotencyKey.trim()
      const demoUser = input.demoUser.trim()
      if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
        throw new Error(
          'A Idempotency-Key deve ter entre 8 e 128 caracteres.',
        )
      }
      if (!demoUser) {
        throw new Error('Selecione um usuário de demonstração antes de doar.')
      }

      const existing = await storage.get(idempotencyKey)
      if (existing) {
        if (!samePublication(existing, { ...input, demoUser })) {
          throw new OfflineQueueConflictError(idempotencyKey)
        }
        return existing
      }

      const enqueuedAt = now().toISOString()
      const item: OfflineDonationPublication = {
        completedAt: null,
        correlationId: input.correlationId ?? createCorrelationId(),
        demoUser,
        endpoint: input.endpoint ?? DEFAULT_ENDPOINT,
        enqueuedAt,
        idempotencyKey,
        requestBody: input.requestBody,
        retry: {
          attemptCount: 0,
          failureKind: null,
          lastAttemptAt: null,
          lastError: null,
          lastStatusCode: null,
          nextAttemptAt: null,
        },
        status: 'pending',
        statusText: OFFLINE_STATUS_TEXT.pending,
        updatedAt: enqueuedAt,
      }
      const added = await storage.add(item)
      if (!added) {
        const concurrent = await storage.get(idempotencyKey)
        if (!concurrent) {
          throw new Error('A publicação offline concorrente não foi encontrada.')
        }
        if (!samePublication(concurrent, { ...input, demoUser })) {
          throw new OfflineQueueConflictError(idempotencyKey)
        }
        return concurrent
      }
      await refreshSnapshot()
      return item
    },
    get: (idempotencyKey) => storage.get(idempotencyKey),
    getSnapshot: () => snapshot,
    list: async () => (await storage.list()).sort(sortPublications),
    retry: async (idempotencyKey) => {
      const existing = await storage.get(idempotencyKey)
      if (!existing) {
        throw new Error('Publicação offline não encontrada.')
      }
      if (existing.status === 'succeeded') return existing

      const updatedAt = now().toISOString()
      const pending: OfflineDonationPublication = {
        ...existing,
        retry: {
          ...existing.retry,
          failureKind: null,
          nextAttemptAt: null,
        },
        status: 'pending',
        statusText: OFFLINE_STATUS_TEXT.pending,
        updatedAt,
      }
      await storage.put(pending)
      await refreshSnapshot()
      return pending
    },
    subscribe: (listener) => {
      listeners.add(listener)
      void refreshSnapshot().catch(() => undefined)
      return () => listeners.delete(listener)
    },
    synchronize,
  }

  return queue
}
