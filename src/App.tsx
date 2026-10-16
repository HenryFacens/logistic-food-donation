import { ReloadPrompt } from './pwa/ReloadPrompt'
import { useInstallPrompt } from './pwa/useInstallPrompt'
import { useOnlineStatus } from './pwa/useOnlineStatus'

function App() {
  const online = useOnlineStatus()
  const { canInstall, installed, install } = useInstallPrompt()

  return (
    <>
      <header className="app-header">
        <img src="/logo.svg" alt="" width={32} height={32} />
        <h1>Hackathon BCG</h1>
        <span className={`status ${online ? 'online' : 'offline'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      <main className="content">
        <section className="card">
          <h2>Bem-vindo</h2>
          <p>
            Este é o ponto de partida do PWA. Edite <code>src/App.tsx</code> para
            começar a construir.
          </p>
        </section>

        <section className="card">
          <h2>Instalação</h2>
          {installed ? (
            <p>App instalado e rodando em modo standalone.</p>
          ) : canInstall ? (
            <button className="btn btn-primary" onClick={install}>
              Instalar app
            </button>
          ) : (
            <p>
              Para instalar, use o menu do navegador (no iOS: Compartilhar →
              Adicionar à Tela de Início).
            </p>
          )}
        </section>
      </main>

      <ReloadPrompt />
    </>
  )
}

export default App
