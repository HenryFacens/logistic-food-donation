import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
import { useOnlineStatus } from '../../pwa/useOnlineStatus'

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

const EMPTY_SNAPSHOT: OfflineQueueSnapshot = {
  lastSyncedAt: null,
  pendingCount: 0,
  syncing: false,
}

export const emptyOfflineQueueBridge: OfflineQueueBridge = {
  getSnapshot: () => EMPTY_SNAPSHOT,
  subscribe: () => () => undefined,
  synchronize: async () => undefined,
}

interface OfflineContextValue extends OfflineQueueSnapshot {
  online: boolean
  synchronize(): Promise<void>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

interface OfflineProviderProps {
  bridge?: OfflineQueueBridge
  children: ReactNode
}

export function OfflineProvider({
  bridge = emptyOfflineQueueBridge,
  children,
}: OfflineProviderProps) {
  const online = useOnlineStatus()
  const queue = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getSnapshot,
  )

  useEffect(() => {
    if (online && queue.pendingCount > 0 && !queue.syncing) {
      void bridge.synchronize()
    }
  }, [bridge, online, queue.pendingCount, queue.syncing])

  const value = useMemo<OfflineContextValue>(
    () => ({
      ...queue,
      online,
      synchronize: () => bridge.synchronize(),
    }),
    [bridge, online, queue],
  )

  return <OfflineContext value={value}>{children}</OfflineContext>
}

export function useOffline() {
  const value = useContext(OfflineContext)
  if (!value) throw new Error('useOffline must be used within OfflineProvider')
  return value
}

