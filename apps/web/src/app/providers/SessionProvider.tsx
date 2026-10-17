import type { DemoUser, Role } from '@resgata/shared'
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'

const STORAGE_KEY = 'resgata.session'
const LEGACY_STORAGE_KEY = 'resgata.demo-user'

export type DemoIdentity = Pick<DemoUser, 'demoKey' | 'displayName' | 'role'> & {
  /** Bearer token from phone sign-in; absent for demo profiles. */
  token?: string
}

export const DEMO_IDENTITIES: readonly DemoIdentity[] = [
  {
    demoKey: 'seller-padaria-cambui',
    displayName: 'Padaria Cambuí',
    role: 'seller',
  },
  {
    demoKey: 'ngo-prato-solidario',
    displayName: 'ONG Prato Solidário',
    role: 'ngo',
  },
  {
    demoKey: 'driver-ana',
    displayName: 'Ana — motorista',
    role: 'driver',
  },
  {
    demoKey: 'partner-cafe-local',
    displayName: 'Café Local — parceiro',
    role: 'partner',
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
    if (stored) {
      const parsed = JSON.parse(stored) as DemoIdentity
      if (parsed?.demoKey && parsed.role && parsed.displayName) return parsed
    }
    const demoKey = localStorage.getItem(LEGACY_STORAGE_KEY)
    return DEMO_IDENTITIES.find((identity) => identity.demoKey === demoKey) || null
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
          localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch {
          // Storage can be unavailable in private browsing.
        }
        setUser(null)
      },
      role: user?.role || null,
      selectUser(identity) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
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

