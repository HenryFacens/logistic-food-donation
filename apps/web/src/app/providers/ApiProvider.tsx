import {
  type ReactNode,
  useMemo,
} from 'react'
import {
  ApiClientProvider,
  createApiClient,
  useApiClient,
} from '../../shared/api'
import { env } from '../../shared/config/env'
import { useSession } from './SessionProvider'

export function ApiProvider({ children }: { children: ReactNode }) {
  const { clearUser, user } = useSession()
  const demoKey = user?.demoKey || null
  const token = user?.token || null

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: env.apiBaseUrl,
        getAuthToken: () => token,
        getDemoKey: () => demoKey,
        onUnauthorized: clearUser,
      }),
    [clearUser, demoKey, token],
  )

  return <ApiClientProvider client={client}>{children}</ApiClientProvider>
}

export { useApiClient }
