import type { ApiClient } from '../../../shared/api'
import { navigate } from '../../../shared/routing'
import {
  Button,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../../../shared/ui'
import { useDemoUsers } from '../api/demoUsers'
import { PhoneLogin } from '../components/PhoneLogin'
import { RoleCard } from '../components/RoleCard'
import {
  buildSessionEntries,
  entryForSignedInUser,
  groupSessionIdentities,
  type SessionEntry,
  type SessionIdentity,
} from '../model/session'
import { sessionMessages } from '../messages'

// The three people in the rescue loop; dashboards are listed below them.
const MAIN_ENTRIES: readonly SessionEntry['entryPoint'][] = ['seller', 'ngo-operations', 'driver']

export interface LoginPageProps {
  apiClient: ApiClient
  currentDemoKey?: string | null
  currentEntryPoint?: SessionEntry['entryPoint'] | null
  fallbackUsers?: readonly SessionIdentity[]
  onNavigate?(path: string): void
  onSelectUser(identity: SessionEntry): void
}

export function LoginPage({
  apiClient,
  currentDemoKey,
  currentEntryPoint,
  fallbackUsers = [],
  onNavigate = navigate,
  onSelectUser,
}: LoginPageProps) {
  const usersQuery = useDemoUsers(apiClient, fallbackUsers)
  const users = groupSessionIdentities(usersQuery.data || [])
  const entries = buildSessionEntries(users)

  const isCurrent = (identity: SessionEntry) =>
    identity.demoKey === currentDemoKey && identity.entryPoint === currentEntryPoint

  const selectIdentity = (identity: SessionEntry) => {
    onSelectUser(identity)
    onNavigate(identity.defaultPath)
  }

  return (
    <div className="grid w-full max-w-6xl gap-6">
      <header className="max-w-2xl">
        <h1 className="mb-2 text-[2rem] leading-tight sm:text-5xl">
          {sessionMessages.title}
        </h1>
        <p className="mb-0 text-base sm:text-lg">{sessionMessages.description}</p>
      </header>

      {usersQuery.isLoading ? (
        <LoadingState label={sessionMessages.loading} />
      ) : null}

      {usersQuery.isError && entries.length ? (
        <output className="block">
          <StatusBadge label={sessionMessages.fallback} tone="warning" />
        </output>
      ) : null}

      {usersQuery.isError && !entries.length ? (
        <EmptyState
          action={
            <Button
              icon="refresh"
              onClick={() => void usersQuery.refetch()}
              variant="primary"
            >
              {sessionMessages.retry}
            </Button>
          }
          description={sessionMessages.emptyDescription}
          icon="warning"
          title={sessionMessages.emptyTitle}
        />
      ) : null}

      {entries.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {entries
            .filter((identity) => MAIN_ENTRIES.includes(identity.entryPoint))
            .map((identity) => (
              <RoleCard
                current={isCurrent(identity)}
                identity={identity}
                key={`${identity.demoKey}:${identity.entryPoint}`}
                onSelect={selectIdentity}
              />
            ))}
        </div>
      ) : null}

      {entries.some((identity) => !MAIN_ENTRIES.includes(identity.entryPoint)) ? (
        <section className="grid gap-2">
          <h2 className="mb-0 text-lg">{sessionMessages.dashboards}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {entries
              .filter((identity) => !MAIN_ENTRIES.includes(identity.entryPoint))
              .map((identity) => (
                <RoleCard
                  compact
                  current={isCurrent(identity)}
                  identity={identity}
                  key={`${identity.demoKey}:${identity.entryPoint}`}
                  onSelect={selectIdentity}
                />
              ))}
          </div>
        </section>
      ) : null}

      <details className="max-w-md">
        <summary className="cursor-pointer font-bold">{sessionMessages.phoneOptional}</summary>
        <div className="mt-3">
          <PhoneLogin
            apiClient={apiClient}
            onSignedIn={(identity) => selectIdentity(entryForSignedInUser(identity))}
          />
        </div>
      </details>
    </div>
  )
}
