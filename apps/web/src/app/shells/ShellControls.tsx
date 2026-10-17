import { Button, StatusBadge } from '../../shared/ui'
import { useSession, useSse, useTheme } from '../providers'
import { navigate } from '../../shared/routing'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  return (
    <Button
      aria-label={`Ativar tema ${nextTheme === 'dark' ? 'escuro' : 'claro'}`}
      icon={nextTheme === 'dark' ? 'moon' : 'sun'}
      onClick={() => setTheme(nextTheme)}
      variant="ghost"
    >
      {nextTheme === 'dark' ? 'Tema escuro' : 'Tema claro'}
    </Button>
  )
}

export function SessionControl() {
  const { clearUser, user } = useSession()
  if (!user) return null
  return (
    <Button
      icon="user"
      onClick={() => {
        clearUser()
        navigate('/entrar')
      }}
      variant="ghost"
    >
      Trocar perfil
    </Button>
  )
}

export function LiveStatus() {
  const { status } = useSse()
  if (status === 'live') {
    return <StatusBadge icon="wifi" label="Atualização ao vivo" tone="success" />
  }
  if (status === 'connecting' || status === 'reconnecting') {
    return <StatusBadge icon="refresh" label="Conectando ao vivo" tone="warning" />
  }
  return <StatusBadge icon="offline" label="Sem atualização ao vivo" tone="neutral" />
}

