import type { DemoUser, Role } from '@resgata/shared'

export type SessionIdentity = Pick<
  DemoUser,
  'demoKey' | 'displayName' | 'role'
>

export const roleLabels: Record<Role, string> = {
  driver: 'Motorista',
  ngo: 'ONG',
  partner: 'Parceiro',
  seller: 'Doador',
}

export const roleDescriptions: Record<Role, string> = {
  driver: 'Organiza coletas e confirma entregas.',
  ngo: 'Analisa ofertas e recebe alimentos.',
  partner: 'Acompanha benefícios e resgates.',
  seller: 'Publica excedentes e acompanha doações.',
}

export const rolePaths: Record<Role, string> = {
  driver: '/coleta',
  ngo: '/ong/ofertas',
  partner: '/parceiro',
  seller: '/doar',
}

export const groupSessionIdentities = (
  identities: readonly SessionIdentity[],
) =>
  [...identities].sort((left, right) => {
    const roleOrder: Role[] = ['seller', 'ngo', 'driver', 'partner']
    const roleDifference =
      roleOrder.indexOf(left.role) - roleOrder.indexOf(right.role)
    return (
      roleDifference ||
      left.displayName.localeCompare(right.displayName, 'pt-BR')
    )
  })
