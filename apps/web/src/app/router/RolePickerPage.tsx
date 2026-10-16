import { AppIcon, Button, Card, SimuladoBadge } from '../../shared/ui'
import { navigate } from '../../shared/routing'
import {
  DEMO_IDENTITIES,
  useSession,
  type DemoIdentity,
} from '../providers'
import { defaultPathForRole } from './contract'

const roleLabels: Record<DemoIdentity['role'], string> = {
  driver: 'Motorista',
  ngo: 'ONG',
  partner: 'Parceiro',
  seller: 'Doador',
}

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
          <Card key={identity.demoKey}>
            <div className="role-picker__card-header">
              <span className="role-picker__icon">
                <AppIcon name={identity.role === 'driver' ? 'route' : 'user'} />
              </span>
              <SimuladoBadge />
            </div>
            <h2>{roleLabels[identity.role]}</h2>
            <p>{identity.displayName}</p>
            <Button
              icon="arrow-right"
              onClick={() => {
                selectUser(identity)
                navigate(defaultPathForRole(identity.role))
              }}
              variant="primary"
            >
              Entrar como {roleLabels[identity.role]}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

