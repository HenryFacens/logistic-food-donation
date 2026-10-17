import { demoUserSchema } from '@resgata/shared'
import { useQuery } from '@tanstack/react-query'
import type { ApiClient } from '../../../shared/api'
import type { SessionIdentity } from '../model/session'

export const sessionKeys = {
  all: ['session'] as const,
  demoUsers: () => [...sessionKeys.all, 'demo-users'] as const,
}

interface DemoUsersResponse {
  items: unknown[]
}

export const useDemoUsers = (
  apiClient: ApiClient,
  fallbackUsers: readonly SessionIdentity[] = [],
) =>
  useQuery({
    queryKey: sessionKeys.demoUsers(),
    queryFn: async () => {
      const response = await apiClient.get<DemoUsersResponse>('/demo/users')
      return demoUserSchema
        .array()
        .parse(response.items)
        .map(
          ({ demoKey, displayName, role }): SessionIdentity => ({
            demoKey,
            displayName,
            role,
          }),
        )
    },
    initialData: fallbackUsers.length ? [...fallbackUsers] : undefined,
    staleTime: 60_000,
  })
