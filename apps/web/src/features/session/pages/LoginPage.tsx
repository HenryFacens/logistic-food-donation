import type { ApiClient } from '../../../shared/api'
import { navigate } from '../../../shared/routing'
import {
  Button,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../../../shared/ui'
import { useDemoUsers } from '../api/demoUsers'
import { RoleCard } from '../components/RoleCard'
import {
  groupSessionIdentities,
  rolePaths,
  type SessionIdentity,
} from '../model/session'
import { sessionMessages } from '../messages'

export interface LoginPageProps {
  apiClient: ApiClient
  currentDemoKey?: string | null
  fallbackUsers?: readonly SessionIdentity[]
  onNavigate?(path: string): void
  onSelectUser(identity: SessionIdentity): void
}

export function LoginPage({
  apiClient,
  currentDemoKey,
  fallbackUsers = [],
  onNavigate = navigate,
  onSelectUser,
}: LoginPageProps) {
  const usersQuery = useDemoUsers(apiClient, fallbackUsers)
  const users = groupSessionIdentities(usersQuery.data || [])

  const selectIdentity = (identity: SessionIdentity) => {
    onSelectUser(identity)
    onNavigate(rolePaths[identity.role])
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

      {usersQuery.isError && users.length ? (
        <output className="block">
          <StatusBadge label={sessionMessages.fallback} tone="warning" />
        </output>
      ) : null}

      {usersQuery.isError && !users.length ? (
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

      {users.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {users.map((identity) => (
            <RoleCard
              current={identity.demoKey === currentDemoKey}
              identity={identity}
              key={identity.demoKey}
              onSelect={selectIdentity}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
