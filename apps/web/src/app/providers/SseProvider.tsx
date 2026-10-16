import type { DonationEvent } from '@resgata/shared'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { QueryScope } from '../../shared/query'
import {
  createFetchSseTransport,
  type ServerEvent,
  type SseTransport,
} from '../../shared/sse'
import { env } from '../../shared/config/env'
import { useQueryInvalidator } from './QueryBridgeProvider'
import { useSession } from './SessionProvider'

export type SseStatus =
  | 'closed'
  | 'connecting'
  | 'error'
  | 'live'
  | 'reconnecting'

interface SseContextValue {
  lastEventId: string | null
  status: SseStatus
}

const SseContext = createContext<SseContextValue>({
  lastEventId: null,
  status: 'closed',
})

const LAST_EVENT_KEY = 'resgata.last-event-id'
const DEFAULT_TRANSPORT = createFetchSseTransport()

export const queryScopesForEvent = (
  event: Pick<DonationEvent, 'eventType'>,
): readonly QueryScope[] => {
  const common: QueryScope[] = ['donations', 'impact', 'admin']
  if (event.eventType.includes('offer')) common.push('offers')
  if (
    event.eventType.includes('pickup') ||
    event.eventType.includes('collect') ||
    event.eventType.includes('deliver')
  ) {
    common.push('pickups')
  }
  return common
}

interface SseProviderProps {
  children: ReactNode
  transport?: SseTransport
}

export function SseProvider({
  children,
  transport = DEFAULT_TRANSPORT,
}: SseProviderProps) {
  const { user } = useSession()
  const invalidator = useQueryInvalidator()
  const [status, setStatus] = useState<SseStatus>('closed')
  const [lastEventId, setLastEventId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(LAST_EVENT_KEY)
    } catch {
      return null
    }
  })
  const lastEventIdRef = useRef(lastEventId)

  useEffect(() => {
    if (!user) return

    let active = true
    let reconnectTimer: number | undefined
    const controller = new AbortController()

    const handleEvent = (serverEvent: ServerEvent) => {
      try {
        const donationEvent = JSON.parse(serverEvent.data) as DonationEvent
        void invalidator.invalidate(queryScopesForEvent(donationEvent))
        if (serverEvent.id) {
          lastEventIdRef.current = serverEvent.id
          setLastEventId(serverEvent.id)
          try {
            sessionStorage.setItem(LAST_EVENT_KEY, serverEvent.id)
          } catch {
            // Resuming remains available for the current connection.
          }
        }
      } catch {
        // Ignore malformed events; the stream remains useful for later events.
      }
    }

    const connect = async (reconnecting = false) => {
      setStatus(reconnecting ? 'reconnecting' : 'connecting')
      try {
        await transport.connect({
          demoKey: user.demoKey,
          lastEventId: lastEventIdRef.current || undefined,
          onEvent: handleEvent,
          onOpen: () => active && setStatus('live'),
          signal: controller.signal,
          url: `${env.apiBaseUrl}/stream`,
        })
        if (active && !controller.signal.aborted) {
          reconnectTimer = window.setTimeout(() => void connect(true), env.sseRetryMs)
        }
      } catch {
        if (active && !controller.signal.aborted) {
          setStatus('error')
          reconnectTimer = window.setTimeout(() => void connect(true), env.sseRetryMs)
        }
      }
    }

    void connect()
    return () => {
      active = false
      controller.abort()
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
    }
  }, [invalidator, transport, user])

  const value = useMemo(
    () => ({ lastEventId, status: user ? status : 'closed' as const }),
    [lastEventId, status, user],
  )
  return <SseContext value={value}>{children}</SseContext>
}

export const useSse = () => useContext(SseContext)
