import type { DemoUser, Role } from '@resgata/shared'

export type SessionIdentity = Pick<
  DemoUser,
  'demoKey' | 'displayName' | 'role'
> & { token?: string }

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
  driver: 'Motorista',
  ngo: 'ONG',
  partner: 'Patrocinador',
  platform: 'Equipe Resgata',
  seller: 'Doador',
}

export const roleDescriptions: Record<Role, string> = {
  driver: 'Busque doações e leve até as ONGs. Ganhe pontos e prêmios.',
  ngo: 'Aceite doações, acompanhe a entrega e confira o que chegou.',
  partner: 'Veja o impacto que sua marca apoia e os prêmios resgatados.',
  platform: 'Acompanhe a operação inteira em tempo real.',
  seller: 'Tire uma foto do que sobrou e doe em um minuto.',
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
          description: roleDescriptions.ngo,
          entryPoint: 'ngo-operations',
          label: 'ONG',
        },
        {
          ...identity,
          defaultPath: '/ong/painel',
          description: 'Quanto a ONG recebeu, de quem e para quantas pessoas.',
          entryPoint: 'ngo-analytics',
          label: 'Impacto da ONG',
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

/** Session entry for a user who signed in by phone (operations view). */
export const entryForSignedInUser = (identity: SessionIdentity): SessionEntry => ({
  ...identity,
  defaultPath: rolePaths[identity.role],
  description: roleDescriptions[identity.role],
  entryPoint: identity.role === 'ngo' ? 'ngo-operations' : identity.role,
  label: roleLabels[identity.role],
})

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
