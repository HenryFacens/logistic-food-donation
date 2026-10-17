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

  const selectIdentity = (identity: SessionEntry) => {
    onSelectUser(identity)
    onNavigate(identity.defaultPath)
  }

  return (
    <div className="grid w-full max-w-6xl gap-6">
      <header className="max-w-2xl">
        <span className="eyebrow">{sessionMessages.eyebrow}</span>
        <h1 className="mb-3 text-4xl font-black leading-tight sm:text-5xl">
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((identity) => (
            <RoleCard
              current={
                identity.demoKey === currentDemoKey &&
                identity.entryPoint === currentEntryPoint
              }
              identity={identity}
              key={`${identity.demoKey}:${identity.entryPoint}`}
              onSelect={selectIdentity}
            />
          ))}
        </div>
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
