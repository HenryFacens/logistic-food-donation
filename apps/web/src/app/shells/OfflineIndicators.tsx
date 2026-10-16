import { Button, StatusBadge } from '../../shared/ui'
import { useOffline } from '../providers'

export function OfflineBanner() {
  const { online } = useOffline()
  if (online) return null
  return (
    <output className="offline-banner">
      <StatusBadge
        icon="offline"
        label="Você está offline. Alterações compatíveis serão enviadas depois."
        tone="warning"
      />
    </output>
  )
}

export function SyncQueueBadge() {
  const { online, pendingCount, synchronize, syncing } = useOffline()
  if (pendingCount === 0) return null
  return (
    <Button
      disabled={!online || syncing}
      icon="refresh"
      onClick={() => void synchronize()}
      variant="ghost"
    >
      {syncing
        ? 'Sincronizando'
        : `${pendingCount} ${pendingCount === 1 ? 'pendência' : 'pendências'}`}
    </Button>
  )
}
