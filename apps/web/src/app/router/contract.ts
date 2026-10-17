import type { Role } from '@resgata/shared'
import type { AppIconName } from '../../shared/ui'

export type ShellKind = 'desktop' | 'mobile' | 'public'

export type RouteId =
  | 'admin'
  | 'community'
  | 'coupons'
  | 'donate'
  | 'driver-dashboard'
  | 'driver-pickups'
  | 'impact'
  | 'login'
  | 'ngo-needs'
  | 'ngo-dashboard'
  | 'ngo-offers'
  | 'ngo-pickups'
  | 'partner'
  | 'platform-dashboard'
  | 'seller-donations'
  | 'seller-metrics'

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
    features: ['community'],
    icon: 'location',
    id: 'community',
    label: 'Hoje',
    navigation: false,
    path: '/hoje',
    shell: 'public',
    title: 'Hoje perto de você',
  },
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
    allowedRoles: ['seller'],
    features: ['impact'],
    icon: 'dashboard',
    id: 'seller-metrics',
    label: 'Métricas',
    navigation: true,
    path: '/metricas',
    shell: 'mobile',
    title: 'Métricas do doador',
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
    features: ['needs'],
    icon: 'coupon',
    id: 'ngo-needs',
    label: 'Pedidos',
    navigation: true,
    path: '/ong/pedidos',
    shell: 'mobile',
    title: 'Pedidos e recebimento',
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
    allowedRoles: ['ngo'],
    features: ['pickups'],
    icon: 'dashboard',
    id: 'ngo-dashboard',
    label: 'Métricas',
    navigation: true,
    path: '/ong/painel',
    shell: 'desktop',
    title: 'Métricas da entidade',
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
    allowedRoles: ['driver'],
    features: ['pickups'],
    icon: 'dashboard',
    id: 'driver-dashboard',
    label: 'Métricas',
    navigation: true,
    path: '/motorista/metricas',
    shell: 'mobile',
    title: 'Métricas do transportador',
  },
  {
    allowedRoles: ['driver'],
    features: ['pickups'],
    icon: 'dashboard',
    id: 'driver-dashboard',
    label: 'Métricas',
    navigation: false,
    path: '/motorista/painel',
    shell: 'mobile',
    title: 'Métricas do transportador',
  },
  {
    allowedRoles: ['seller'],
    features: ['impact', 'donations'],
    icon: 'dashboard',
    id: 'impact',
    label: 'Painel',
    navigation: false,
    path: '/painel',
    shell: 'desktop',
    title: 'Painel de impacto',
  },
  {
    allowedRoles: ['partner'],
    features: ['partner'],
    icon: 'partner',
    id: 'partner',
    label: 'Patrocinador',
    navigation: true,
    path: '/patrocinador',
    shell: 'desktop',
    title: 'Painel do patrocinador',
  },
  {
    allowedRoles: ['partner'],
    features: ['partner'],
    icon: 'partner',
    id: 'partner',
    label: 'Patrocinador',
    navigation: false,
    path: '/parceiro',
    shell: 'desktop',
    title: 'Painel do patrocinador',
  },
  {
    allowedRoles: ['platform'],
    features: ['admin'],
    icon: 'dashboard',
    id: 'platform-dashboard',
    label: 'Plataforma',
    navigation: true,
    path: '/plataforma',
    shell: 'desktop',
    title: 'Saúde da operação',
  },
  {
    allowedRoles: ['platform'],
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
  if (route.shell === 'public') return true
  if (!role) return false
  return route.allowedRoles === 'any' || route.allowedRoles.includes(role)
}

export const defaultPathForRole = (role: Role | null) => {
  if (role === 'seller') return '/doar'
  if (role === 'ngo') return '/ong/ofertas'
  if (role === 'driver') return '/coleta'
  if (role === 'partner') return '/patrocinador'
  if (role === 'platform') return '/plataforma'
  return '/entrar'
}

export const navigationForRole = (role: Role, shell: ShellKind) =>
  APP_ROUTES.filter(
    (route) =>
      route.navigation &&
      route.shell === shell &&
      (route.allowedRoles === 'any' || route.allowedRoles.includes(role)),
  )
