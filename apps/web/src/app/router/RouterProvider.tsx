import { useEffect, type ReactNode } from 'react'
import { navigate } from '../../shared/routing'
import { Button, EmptyState } from '../../shared/ui'
import { useSession } from '../providers'
import { DesktopShell, MobileShell, PublicShell } from '../shells'
import {
  canAccessRoute,
  defaultPathForRole,
  routeByPath,
  type AppRoute,
  type RouteId,
} from './contract'
import { FoundationDemoPage } from './FoundationDemoPage'
import { RolePickerPage } from './RolePickerPage'
import { usePathname } from './usePathname'

type RouteElements = Partial<Record<RouteId, ReactNode>>

const renderShell = (route: AppRoute, content: ReactNode) => {
  if (route.shell === 'mobile') {
    return <MobileShell route={route}>{content}</MobileShell>
  }
  if (route.shell === 'desktop') {
    return <DesktopShell route={route}>{content}</DesktopShell>
  }
  return <PublicShell>{content}</PublicShell>
}

export function RouterProvider({
  routeElements = {},
}: {
  routeElements?: RouteElements
}) {
  const pathname = usePathname()
  const { role } = useSession()
  const route = routeByPath(pathname)

  useEffect(() => {
    if (pathname === '/') {
      navigate(defaultPathForRole(role), true)
      return
    }
    if (route && route.id !== 'login' && !role) {
      navigate('/entrar', true)
    }
  }, [pathname, role, route])

  if (pathname === '/') return null

  if (!route) {
    return (
      <PublicShell>
        <EmptyState
          action={
            <Button icon="home" onClick={() => navigate(defaultPathForRole(role))}>
              Voltar ao início
            </Button>
          }
          description="O endereço informado não pertence ao Resgata."
          icon="warning"
          title="Página não encontrada"
        />
      </PublicShell>
    )
  }

  if (route.id === 'login') {
    return renderShell(route, routeElements.login || <RolePickerPage />)
  }

  if (!role) return null

  if (!canAccessRoute(route, role)) {
    return renderShell(
      route,
      <EmptyState
        action={
          <Button
            icon="arrow-right"
            onClick={() => navigate(defaultPathForRole(role))}
          >
            Ir para meu início
          </Button>
        }
        description="O perfil selecionado não tem acesso a esta rota."
        icon="warning"
        title="Acesso não permitido"
      />,
    )
  }

  return renderShell(
    route,
    routeElements[route.id] || <FoundationDemoPage route={route} />,
  )
}

