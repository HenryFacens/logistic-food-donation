import type { AppRoute } from './contract'
import {
  Button,
  Card,
  SimuladoBadge,
  StatusBadge,
} from '../../shared/ui'
import { useInstallPrompt } from '../../pwa/useInstallPrompt'
import { useOffline, useSse } from '../providers'

export function FoundationDemoPage({ route }: { route: AppRoute }) {
  const { online } = useOffline()
  const { status } = useSse()
  const { canInstall, install, installed } = useInstallPrompt()

  return (
    <div className="foundation-demo">
      <Card className="foundation-demo__hero">
        <div className="foundation-demo__heading">
          <div>
            <span className="eyebrow">Fundação web-core</span>
            <h2>{route.title}</h2>
          </div>
          <SimuladoBadge />
        </div>
        <p>
          A rota e o shell já respeitam o contrato. O conteúdo da feature será
          conectado pelo agente responsável por{' '}
          <strong>{route.features.join(' + ')}</strong>.
        </p>
      </Card>

      <div className="foundation-demo__grid">
        <Card title="Estado da aplicação">
          <div className="status-list">
            <StatusBadge
              icon={online ? 'wifi' : 'offline'}
              label={online ? 'Conexão disponível' : 'Sem conexão'}
              tone={online ? 'success' : 'warning'}
            />
            <StatusBadge
              icon={status === 'live' ? 'wifi' : 'refresh'}
              label={
                status === 'live'
                  ? 'Eventos ao vivo'
                  : 'Eventos ao vivo aguardando API'
              }
              tone={status === 'live' ? 'success' : 'neutral'}
            />
          </div>
        </Card>
        <Card title="Aplicativo instalável">
          <p>
            {installed
              ? 'O Resgata está instalado neste dispositivo.'
              : 'Instale o PWA para acesso rápido e suporte offline.'}
          </p>
          {canInstall && !installed ? (
            <Button icon="arrow-right" onClick={install} variant="primary">
              Instalar Resgata
            </Button>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

