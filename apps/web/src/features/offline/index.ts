export {
  createOfflineDonationQueue,
  OfflineQueueConflictError,
  type CreateOfflineDonationQueueOptions,
} from './queue'
export {
  IndexedDbOfflineQueueStorage,
  type IndexedDbOfflineQueueStorageOptions,
} from './storage'
export {
  OFFLINE_STATUS_TEXT,
  type EnqueueDonationPublicationInput,
  type OfflineDonationPublication,
  type OfflineDonationQueue,
  type OfflineFailureKind,
  type OfflinePublicationStatus,
  type OfflineQueueBridge,
  type OfflineQueueSnapshot,
  type OfflineQueueStorage,
  type OfflineRetryMetadata,
} from './types'

import { createOfflineDonationQueue } from './queue'
import type { EnqueueDonationPublicationInput } from './types'

export const offlineDonationQueue = createOfflineDonationQueue()
export const offlineQueueBridge = offlineDonationQueue

export const enqueueDonationPublication = (
  input: EnqueueDonationPublicationInput,
) => offlineDonationQueue.enqueue(input)

