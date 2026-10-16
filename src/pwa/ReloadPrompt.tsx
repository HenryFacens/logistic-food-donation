import { useRegisterSW } from 'virtual:pwa-register/react'

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
    <div className="toast" role="status">
      <span>
        {needRefresh
          ? 'Nova versão disponível.'
          : 'App pronto para funcionar offline.'}
      </span>
      <div className="toast-actions">
        {needRefresh && (
          <button className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </button>
        )}
        <button className="btn" onClick={close}>
          Fechar
        </button>
      </div>
    </div>
  )
}
