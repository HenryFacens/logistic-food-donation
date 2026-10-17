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
  const { role, user } = useSession()
  const route = routeByPath(pathname)

  useEffect(() => {
    window.scrollTo({ behavior: 'auto', left: 0, top: 0 })
  }, [pathname])

  useEffect(() => {
    if (pathname === '/') {
      navigate(user?.defaultPath || defaultPathForRole(role), true)
      return
    }
    if (route && route.shell !== 'public' && !role) {
      navigate('/entrar', true)
    }
  }, [pathname, role, route, user?.defaultPath])

  if (pathname === '/') return null

  if (!route) {
    return (
      <PublicShell>
        <EmptyState
          action={
            <Button
              icon="home"
              onClick={() =>
                navigate(user?.defaultPath || defaultPathForRole(role))
              }
            >
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

  if (route.shell === 'public') {
    return renderShell(
      route,
      routeElements[route.id] ||
        (route.id === 'login' ? <RolePickerPage /> : <FoundationDemoPage route={route} />),
    )
  }

  if (!role) return null

  if (!canAccessRoute(route, role)) {
    return renderShell(
      route,
      <EmptyState
        action={
          <Button
            icon="arrow-right"
            onClick={() =>
              navigate(user?.defaultPath || defaultPathForRole(role))
            }
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
