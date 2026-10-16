import type { Role } from '@resgata/shared'
import type { AppIconName } from '../../shared/ui'

export type ShellKind = 'desktop' | 'mobile' | 'public'

export type RouteId =
  | 'admin'
  | 'coupons'
  | 'donate'
  | 'driver-pickups'
  | 'impact'
  | 'login'
  | 'ngo-offers'
  | 'ngo-pickups'
  | 'partner'
  | 'seller-donations'

export interface AppRoute {
  allowedRoles: readonly Role[] | 'any'
  features: readonly string[]
  icon: AppIconName
  id: RouteId
  label: string
  navigation: boolean
  path: string
  shell: ShellKind
  title: string
}

export const APP_ROUTES: readonly AppRoute[] = [
  {
    allowedRoles: 'any',
    features: ['session'],
    icon: 'user',
    id: 'login',
    label: 'Entrar',
    navigation: false,
    path: '/entrar',
    shell: 'public',
    title: 'Escolha um perfil',
  },
  {
    allowedRoles: ['seller'],
    features: ['vision', 'donations'],
    icon: 'donation',
    id: 'donate',
    label: 'Doar',
    navigation: true,
    path: '/doar',
    shell: 'mobile',
    title: 'Nova doação',
  },
  {
    allowedRoles: ['seller'],
    features: ['donations'],
    icon: 'home',
    id: 'seller-donations',
    label: 'Doações',
    navigation: true,
    path: '/minhas-doacoes',
    shell: 'mobile',
    title: 'Minhas doações',
  },
  {
    allowedRoles: ['ngo'],
    features: ['offers'],
    icon: 'donation',
    id: 'ngo-offers',
    label: 'Ofertas',
    navigation: true,
    path: '/ong/ofertas',
    shell: 'mobile',
    title: 'Ofertas para a ONG',
  },
  {
    allowedRoles: ['ngo'],
    features: ['pickups'],
    icon: 'route',
    id: 'ngo-pickups',
    label: 'Recebimentos',
    navigation: true,
    path: '/ong/recebimentos',
    shell: 'mobile',
    title: 'Recebimentos',
  },
  {
    allowedRoles: ['driver'],
    features: ['pickups'],
    icon: 'route',
    id: 'driver-pickups',
    label: 'Coletas',
    navigation: true,
    path: '/coleta',
    shell: 'mobile',
    title: 'Rota de coleta',
  },
  {
    allowedRoles: ['driver'],
    features: ['coupons'],
    icon: 'coupon',
    id: 'coupons',
    label: 'Cupons',
    navigation: true,
    path: '/cupons',
    shell: 'mobile',
    title: 'Carteira de cupons',
  },
  {
    allowedRoles: ['seller'],
    features: ['impact', 'donations'],
    icon: 'dashboard',
    id: 'impact',
    label: 'Painel',
    navigation: true,
    path: '/painel',
    shell: 'desktop',
    title: 'Painel de impacto',
  },
  {
    allowedRoles: ['partner'],
    features: ['partner'],
    icon: 'partner',
    id: 'partner',
    label: 'Parceiro',
    navigation: true,
    path: '/parceiro',
    shell: 'desktop',
    title: 'Painel do parceiro',
  },
  {
    allowedRoles: 'any',
    features: ['admin'],
    icon: 'admin',
    id: 'admin',
    label: 'Filas',
    navigation: true,
    path: '/admin/queues',
    shell: 'desktop',
    title: 'Administração de filas',
  },
]

export const routeByPath = (path: string) =>
  APP_ROUTES.find((route) => route.path === path)

export const canAccessRoute = (route: AppRoute, role: Role | null) => {
  if (route.id === 'login') return true
  if (!role) return false
  return route.allowedRoles === 'any' || route.allowedRoles.includes(role)
}

export const defaultPathForRole = (role: Role | null) => {
  if (role === 'seller') return '/doar'
  if (role === 'ngo') return '/ong/ofertas'
  if (role === 'driver') return '/coleta'
  if (role === 'partner') return '/parceiro'
  return '/entrar'
}

export const navigationForRole = (role: Role, shell: ShellKind) =>
  APP_ROUTES.filter(
    (route) =>
      route.navigation &&
      route.shell === shell &&
      (route.allowedRoles === 'any' || route.allowedRoles.includes(role)),
  )

