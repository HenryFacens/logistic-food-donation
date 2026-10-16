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
  const { user } = useSession()
  const demoKey = user?.demoKey || null

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: env.apiBaseUrl,
        getDemoKey: () => demoKey,
      }),
    [demoKey],
  )

  return <ApiClientProvider client={client}>{children}</ApiClientProvider>
}

export { useApiClient }
