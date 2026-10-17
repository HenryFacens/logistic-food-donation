import type { DemoUser, Role } from '@resgata/shared'

export type SessionIdentity = Pick<
  DemoUser,
  'demoKey' | 'displayName' | 'role'
>

export type SessionEntryPoint =
  | 'driver'
  | 'ngo-analytics'
  | 'ngo-operations'
  | 'partner'
  | 'platform'
  | 'seller'

export interface SessionEntry extends SessionIdentity {
  defaultPath: string
  description: string
  entryPoint: SessionEntryPoint
  label: string
}

export const roleLabels: Record<Role, string> = {
  driver: 'Transportador',
  ngo: 'ONG / entidade',
  partner: 'Patrocinador',
  platform: 'Plataforma Resgata',
  seller: 'Doador',
}

export const roleDescriptions: Record<Role, string> = {
  driver: 'Executa coletas, entregas e acompanha reputação e recompensas.',
  ngo: 'Analisa ofertas, confirma recebimentos e acompanha a distribuição.',
  partner: 'Acompanha campanhas, benefícios, retorno e impacto.',
  platform: 'Acompanha a saúde global da operação e suas filas.',
  seller: 'Publica excedentes, acompanha impacto e avalia o transportador.',
}

export const rolePaths: Record<Role, string> = {
  driver: '/coleta',
  ngo: '/ong/ofertas',
  partner: '/patrocinador',
  platform: '/plataforma',
  seller: '/doar',
}

const primaryDemoKeys: Partial<Record<Role, string>> = {
  driver: 'driver-ana',
  ngo: 'ngo-prato-solidario',
  partner: 'partner-cafe-local',
  platform: 'platform-resgata',
  seller: 'seller-padaria-cambui',
}

export const buildSessionEntries = (
  identities: readonly SessionIdentity[],
): SessionEntry[] => {
  const primary = Array.from(
    new Map(
      identities
        .filter(
          (identity) =>
            !primaryDemoKeys[identity.role] ||
            primaryDemoKeys[identity.role] === identity.demoKey,
        )
        .map((identity) => [identity.role, identity]),
    ).values(),
  )

  return primary.flatMap((identity): SessionEntry[] => {
    if (identity.role === 'ngo') {
      return [
        {
          ...identity,
          defaultPath: '/ong/ofertas',
          description:
            'Produto mobile para aceitar ofertas e conferir a recepção dos alimentos.',
          entryPoint: 'ngo-operations',
          label: 'ONG — Operação',
        },
        {
          ...identity,
          defaultPath: '/ong/painel',
          description:
            'Produto web para recebimento, logística, distribuição e impacto social.',
          entryPoint: 'ngo-analytics',
          label: 'ONG — Métricas',
        },
      ]
    }

    return [
      {
        ...identity,
        defaultPath: rolePaths[identity.role],
        description: roleDescriptions[identity.role],
        entryPoint: identity.role,
        label: roleLabels[identity.role],
      },
    ]
  })
}

export const groupSessionIdentities = (
  identities: readonly SessionIdentity[],
) =>
  [...identities].sort((left, right) => {
    const roleOrder: Role[] = [
      'seller',
      'driver',
      'ngo',
      'partner',
      'platform',
    ]
    const roleDifference =
      roleOrder.indexOf(left.role) - roleOrder.indexOf(right.role)
    return (
      roleDifference ||
      left.displayName.localeCompare(right.displayName, 'pt-BR')
    )
  })
