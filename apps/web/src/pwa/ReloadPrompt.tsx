import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../shared/ui'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS)
    },
  })

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <output className="toast">
      <span>
        {needRefresh
          ? 'Nova versão disponível.'
          : 'Pronto: o app também abre sem internet.'}
      </span>
      <div className="toast-actions">
        {needRefresh && (
          <Button
            icon="refresh"
            onClick={() => updateServiceWorker(true)}
            variant="primary"
          >
            Atualizar
          </Button>
        )}
        <Button onClick={close} variant="ghost">
          Fechar
        </Button>
      </div>
    </output>
  )
}
