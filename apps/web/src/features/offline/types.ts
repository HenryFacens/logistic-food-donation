import type { CreateDonationRequest } from '@resgata/shared'

export type OfflinePublicationStatus =
  | 'pending'
  | 'retryable_failure'
  | 'permanent_failure'
  | 'succeeded'

export type OfflineFailureKind = 'retryable' | 'permanent'

export interface OfflineRetryMetadata {
  attemptCount: number
  failureKind: OfflineFailureKind | null
  lastAttemptAt: string | null
  lastError: string | null
  lastStatusCode: number | null
  nextAttemptAt: string | null
}

export interface OfflineDonationPublication {
  /** Session token for phone sign-in; demo profiles use demoUser only. */
  authToken?: string
  completedAt: string | null
  correlationId: string
  demoUser: string
  endpoint: string
  enqueuedAt: string
  idempotencyKey: string
  requestBody: CreateDonationRequest
  retry: OfflineRetryMetadata
  status: OfflinePublicationStatus
  statusText: string
  updatedAt: string
}

export interface EnqueueDonationPublicationInput {
  authToken?: string
  correlationId?: string
  demoUser: string
  endpoint?: string
  idempotencyKey: string
  requestBody: CreateDonationRequest
}

export interface OfflineQueueSnapshot {
  lastSyncedAt: string | null
  pendingCount: number
  syncing: boolean
}

export interface OfflineQueueBridge {
  getSnapshot(): OfflineQueueSnapshot
  subscribe(listener: () => void): () => void
  synchronize(): Promise<void>
}

export interface OfflineDonationQueue extends OfflineQueueBridge {
  enqueue(
    input: EnqueueDonationPublicationInput,
  ): Promise<OfflineDonationPublication>
  get(idempotencyKey: string): Promise<OfflineDonationPublication | undefined>
  list(): Promise<OfflineDonationPublication[]>
  retry(idempotencyKey: string): Promise<OfflineDonationPublication>
}

export interface OfflineQueueStorage {
  add(item: OfflineDonationPublication): Promise<boolean>
  get(idempotencyKey: string): Promise<OfflineDonationPublication | undefined>
  list(): Promise<OfflineDonationPublication[]>
  put(item: OfflineDonationPublication): Promise<void>
}

export const OFFLINE_STATUS_TEXT = {
  pending: 'Aguardando conexão para publicar.',
  permanent_failure:
    'Não foi possível publicar. Revise os dados antes de tentar novamente.',
  retryable_failure:
    'Falha temporária. Uma nova tentativa será feita automaticamente.',
  succeeded: 'Doação publicada e sincronizada.',
} as const satisfies Record<OfflinePublicationStatus, string>
