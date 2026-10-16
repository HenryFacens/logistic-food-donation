# Routes, data flow, and offline behavior

## Route ownership

The route table owns layout selection, role guards, and lazy loading.

| Route | Feature composition | Layout | Allowed role |
|---|---|---|---|
| `/entrar` | `session` | `PublicShell` | any |
| `/doar` | `vision` + `donations` | `MobileShell` | seller |
| `/minhas-doacoes` | `donations` | `MobileShell` | seller |
| `/ong/ofertas` | `offers` | `MobileShell` | ngo |
| `/ong/recebimentos` | `pickups` | `MobileShell` | ngo |
| `/coleta` | `pickups` | `MobileShell` | driver |
| `/cupons` | `coupons` | `MobileShell` | driver |
| `/painel` | `impact` + `donations` | `DesktopShell` | seller |
| `/parceiro` | `partner` | `DesktopShell` | partner |
| `/admin/queues` | `admin` | `DesktopShell` | any in the demo |

Rules:

- Guards live in `app/router` and read session state from the `session` feature's public API.
- Pages do not choose or render their shell.
- Every feature route is lazy-loaded with `React.lazy`; mobile routes must not eagerly include desktop dashboard code.
- `MobileShell` owns bottom navigation, `OfflineBanner`, and `SyncQueueBadge`.
- `DesktopShell` owns the sidebar, top bar, and live indicator.
- `PublicShell` is limited to the role-entry flow.

## Data flow

Reads:

1. A page/component invokes an owning feature query hook.
2. The hook in `features/<owner>/api` calls `shared/api`.
3. TanStack Query owns caching and server-state lifecycle.
4. Components render the hook result; they do not call `fetch` directly.

Use a per-feature query-key factory such as `donationKeys.list(filters)`. Do not use inline string keys.

Live updates:

- Maintain one SSE connection in `app/providers`.
- Translate events into invalidation of the relevant feature query keys.
- Features must not open independent SSE streams.

Errors:

- Normalize transport/API failures once in `shared/api`.
- Map them there to user-facing pt-BR messages.
- Features render normalized errors instead of duplicating transport interpretation.

## Writes and offline integration

Online-capable mutations send an `Idempotency-Key`. For writes that must work offline:

1. Invoke the shared feature-facing `useOfflineMutation` contract from `features/offline`.
2. Persist the operation and its idempotency key in IndexedDB.
3. Expose the queued result as `Pendente` in the affected UI.
4. Show queue/connectivity state through the mobile shell indicators.
5. On the browser `online` event, replay the stored operation with the same key.
6. Invalidate the owning feature's query keys after confirmed synchronization.

Do not create a second offline queue inside a business feature, generate a new idempotency key during replay, or bypass the centralized API error mapping.

## Provider ownership

`app/providers` composes application-wide QueryClient, session, toast, SSE, and offline providers. Business features consume these contracts but do not create competing global providers or connections.
