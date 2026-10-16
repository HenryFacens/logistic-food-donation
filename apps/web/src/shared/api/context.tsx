import {
  createContext,
  type ReactNode,
  useContext,
} from 'react'
import type { ApiClient } from './client'

const ApiClientContext = createContext<ApiClient | null>(null)

export function ApiClientProvider({
  children,
  client,
}: {
  children: ReactNode
  client: ApiClient
}) {
  return <ApiClientContext value={client}>{children}</ApiClientContext>
}

export function useApiClient() {
  const value = useContext(ApiClientContext)
  if (!value) {
    throw new Error('useApiClient must be used within ApiClientProvider')
  }
  return value
}
