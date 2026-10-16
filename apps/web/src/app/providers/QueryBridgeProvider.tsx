import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  type QueryInvalidator,
  type QueryScope,
} from '../../shared/query'

const QueryBridgeContext = createContext<QueryInvalidator | null>(null)

interface QueryBridgeProviderProps {
  children: ReactNode
  invalidator?: QueryInvalidator
}

function QueryInvalidatorProvider({
  children,
  invalidator,
}: QueryBridgeProviderProps) {
  const queryClient = useQueryClient()
  const queryInvalidator = useMemo<QueryInvalidator>(
    () =>
      invalidator ?? {
        invalidate(scopes: readonly QueryScope[]) {
          const selected = new Set<string>(scopes)
          return queryClient.invalidateQueries({
            predicate: (query) => selected.has(String(query.queryKey[0])),
          })
        },
      },
    [invalidator, queryClient],
  )

  return (
    <QueryBridgeContext value={queryInvalidator}>
      {children}
    </QueryBridgeContext>
  )
}

export function QueryBridgeProvider(props: QueryBridgeProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 15_000,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <QueryInvalidatorProvider {...props} />
    </QueryClientProvider>
  )
}

export const useQueryInvalidator = () => {
  const value = useContext(QueryBridgeContext)
  if (!value) {
    throw new Error(
      'useQueryInvalidator must be used within QueryBridgeProvider',
    )
  }
  return value
}
