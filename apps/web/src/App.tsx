import { useMemo } from 'react'
import {
  AppProviders,
  DEMO_IDENTITIES,
  useApiClient,
  useSession,
} from './app/providers'
import { RouterProvider } from './app/router'
import {
  adminRouteElement,
  PlatformDashboardPage,
} from './features/admin'
import { couponRouteElements } from './features/coupons'
import { CommunityTodayPage } from './features/community'
import {
  createOnlineDonationPublisher,
  DonatePage,
  SellerDonationsPage,
  SellerDonationSection,
  type DonationPublisher,
} from './features/donations'
import { ImpactPage, SellerMetricsPage } from './features/impact'
import {
  enqueueDonationPublication,
  offlineQueueBridge,
} from './features/offline'
import { needsRouteElements } from './features/needs'
import { offersRouteElements } from './features/offers'
import { partnerRouteElement } from './features/partner'
import {
  DriverDashboardPage,
  NgoDashboardPage,
  pickupRouteElements,
} from './features/pickups'
import { LoginPage } from './features/session'
import { ReloadPrompt } from './pwa/ReloadPrompt'
import { ApiClientError } from './shared/api'
import { env } from './shared/config/env'

function AppRoutes() {
  const apiClient = useApiClient()
  const { selectUser, user } = useSession()
  const onlinePublisher = useMemo(
    () => createOnlineDonationPublisher(apiClient),
    [apiClient],
  )
  const publisher = useMemo<DonationPublisher>(
    () => async (operation) => {
      const offline =
        typeof navigator !== 'undefined' && navigator.onLine === false
      if (!offline) {
        try {
          return await onlinePublisher(operation)
        } catch (error) {
          if (!(error instanceof ApiClientError) || !error.retryable) {
            throw error
          }
        }
      }
      if (!user) {
        throw new Error('Selecione um perfil antes de publicar offline.')
      }
      const endpoint = `${env.apiBaseUrl.replace(/\/+$/, '')}/${operation.path.replace(/^\/+/, '')}`
      const queued = await enqueueDonationPublication({
        authToken: user.token,
        demoUser: user.demoKey,
        endpoint,
        idempotencyKey: operation.idempotencyKey,
        requestBody: operation.body,
      })
      return {
        operationId: queued.idempotencyKey,
        status: 'queued',
      }
    },
    [onlinePublisher, user],
  )

  return (
    <RouterProvider
      routeElements={{
        admin: adminRouteElement,
        community: <CommunityTodayPage />,
        ...couponRouteElements,
        donate: <DonatePage apiClient={apiClient} publisher={publisher} />,
        'driver-dashboard': <DriverDashboardPage />,
        impact: (
          <div className="grid gap-6">
            <ImpactPage />
            <SellerDonationSection apiClient={apiClient} />
          </div>
        ),
        login: (
          <LoginPage
            apiClient={apiClient}
            currentDemoKey={user?.demoKey}
            currentEntryPoint={user?.entryPoint}
            fallbackUsers={DEMO_IDENTITIES}
            onSelectUser={selectUser}
          />
        ),
        ...needsRouteElements,
        ...offersRouteElements,
        'ngo-dashboard': <NgoDashboardPage />,
        partner: partnerRouteElement,
        'platform-dashboard': <PlatformDashboardPage />,
        ...pickupRouteElements,
        'seller-donations': <SellerDonationsPage apiClient={apiClient} />,
        'seller-metrics': <SellerMetricsPage />,
      }}
    />
  )
}

function App() {
  return (
    <AppProviders offlineBridge={offlineQueueBridge}>
      <AppRoutes />
      <ReloadPrompt />
    </AppProviders>
  )
}

export default App
