import type { ReactNode } from 'react'
import type { QueryInvalidator } from '../../shared/query'
import type { OfflineQueueBridge } from './OfflineProvider'
import { ApiProvider } from './ApiProvider'
import { OfflineProvider } from './OfflineProvider'
import { QueryBridgeProvider } from './QueryBridgeProvider'
import { SessionProvider } from './SessionProvider'
import { SseProvider } from './SseProvider'
import { ThemeProvider } from './ThemeProvider'
import { ToastProvider } from './ToastProvider'

interface AppProvidersProps {
  children: ReactNode
  offlineBridge?: OfflineQueueBridge
  queryInvalidator?: QueryInvalidator
}

export function AppProviders({
  children,
  offlineBridge,
  queryInvalidator,
}: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SessionProvider>
          <ApiProvider>
            <QueryBridgeProvider invalidator={queryInvalidator}>
              <OfflineProvider bridge={offlineBridge}>
                <SseProvider>{children}</SseProvider>
              </OfflineProvider>
            </QueryBridgeProvider>
          </ApiProvider>
        </SessionProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

