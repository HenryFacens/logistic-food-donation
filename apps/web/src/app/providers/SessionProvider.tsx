import type { DemoUser, Role } from '@resgata/shared'
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'

const STORAGE_KEY = 'resgata.demo-session'

export type DemoEntryPoint =
  | 'driver'
  | 'ngo-analytics'
  | 'ngo-operations'
  | 'partner'
  | 'platform'
  | 'seller'

export type DemoIdentity = Pick<
  DemoUser,
  'demoKey' | 'displayName' | 'role'
> & {
  defaultPath: string
  description: string
  entryPoint: DemoEntryPoint
  label: string
}

export const DEMO_IDENTITIES: readonly DemoIdentity[] = [
  {
    defaultPath: '/doar',
    demoKey: 'seller-padaria-cambui',
    description:
      'Publica excedentes, acompanha impacto e avalia o transportador.',
    displayName: 'Padaria Cambuí',
    entryPoint: 'seller',
    label: 'Doador',
    role: 'seller',
  },
  {
    defaultPath: '/ong/ofertas',
    demoKey: 'ngo-prato-solidario',
    description:
      'Produto mobile para aceitar ofertas e conferir a recepção dos alimentos.',
    displayName: 'ONG Prato Solidário',
    entryPoint: 'ngo-operations',
    label: 'ONG — Operação',
    role: 'ngo',
  },
  {
    defaultPath: '/ong/painel',
    demoKey: 'ngo-prato-solidario',
    description:
      'Produto web para recebimento, logística, distribuição e impacto social.',
    displayName: 'ONG Prato Solidário',
    entryPoint: 'ngo-analytics',
    label: 'ONG — Métricas',
    role: 'ngo',
  },
  {
    defaultPath: '/coleta',
    demoKey: 'driver-ana',
    description:
      'Executa coletas, entregas e acompanha reputação e recompensas.',
    displayName: 'Ana — transportadora',
    entryPoint: 'driver',
    label: 'Transportador',
    role: 'driver',
  },
  {
    defaultPath: '/patrocinador',
    demoKey: 'partner-cafe-local',
    description: 'Acompanha campanhas, benefícios, retorno e impacto.',
    displayName: 'Café Local — patrocinador',
    entryPoint: 'partner',
    label: 'Patrocinador',
    role: 'partner',
  },
  {
    defaultPath: '/plataforma',
    demoKey: 'platform-resgata',
    description: 'Acompanha a saúde global da operação e suas filas.',
    displayName: 'Equipe Resgata',
    entryPoint: 'platform',
    label: 'Plataforma Resgata',
    role: 'platform',
  },
]

interface SessionContextValue {
  clearUser(): void
  role: Role | null
  selectUser(identity: DemoIdentity): void
  user: DemoIdentity | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

const restoreIdentity = (): DemoIdentity | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as {
      demoKey?: string
      entryPoint?: DemoEntryPoint
    }
    return (
      DEMO_IDENTITIES.find(
        (identity) =>
          identity.demoKey === parsed.demoKey &&
          identity.entryPoint === parsed.entryPoint,
      ) || null
    )
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoIdentity | null>(restoreIdentity)

  const value = useMemo<SessionContextValue>(
    () => ({
      clearUser() {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // Storage can be unavailable in private browsing.
        }
        setUser(null)
      },
      role: user?.role || null,
      selectUser(identity) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              demoKey: identity.demoKey,
              entryPoint: identity.entryPoint,
            }),
          )
        } catch {
          // The in-memory session remains usable.
        }
        setUser(identity)
      },
      user,
    }),
    [user],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within SessionProvider')
  return value
}
