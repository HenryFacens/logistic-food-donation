import { AppIcon, Button, Card, SimuladoBadge } from '../../shared/ui'
import { navigate } from '../../shared/routing'
import {
  DEMO_IDENTITIES,
  useSession,
} from '../providers'

export function RolePickerPage() {
  const { selectUser } = useSession()

  return (
    <div className="role-picker">
      <div>
        <span className="eyebrow">Demonstração local</span>
        <h1>Quem você quer representar?</h1>
        <p>
          O perfil escolhido será enviado à API pelo cabeçalho{' '}
          <code>X-Demo-User</code>.
        </p>
      </div>
      <div className="role-picker__grid">
        {DEMO_IDENTITIES.map((identity) => (
          <Card key={`${identity.demoKey}:${identity.entryPoint}`}>
            <div className="role-picker__card-header">
              <span className="role-picker__icon">
                <AppIcon
                  name={
                    identity.role === 'driver'
                      ? 'route'
                      : identity.role === 'platform'
                        ? 'dashboard'
                        : 'user'
                  }
                />
              </span>
              <SimuladoBadge />
            </div>
            <h2>{identity.label}</h2>
            <p>{identity.displayName}</p>
            <Button
              aria-label={`Entrar em ${identity.label} como ${identity.displayName}`}
              icon="arrow-right"
              onClick={() => {
                selectUser(identity)
                navigate(identity.defaultPath)
              }}
              variant="primary"
            >
              Entrar em {identity.label}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
