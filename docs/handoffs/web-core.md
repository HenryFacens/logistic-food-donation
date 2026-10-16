# Web core handoff — Phase 2

## Completed

- Added the central route contract with role guards and Public, Mobile, and
  Desktop shell selection for every documented route.
- Added a temporary pt-BR role picker using the stable seeded demo keys and
  persisting the selected `X-Demo-User` identity locally.
- Added application providers for:
  - demo session;
  - theme and dark mode;
  - normalized API access;
  - offline queue bridge and connectivity;
  - query invalidation bridge;
  - one resumable application-level SSE stream;
  - toast feedback.
- Added a fetch-stream SSE transport because the native `EventSource` API
  cannot send the required `X-Demo-User` header. The transport also sends
  `Last-Event-ID`.
- Added a shared API client with:
  - `X-Demo-User`, `X-Correlation-Id`, and `Idempotency-Key` support;
  - JSON request handling;
  - normalized pt-BR errors;
  - retryability metadata;
  - idempotency-key generation.
- Added shared UI primitives for buttons, cards, links, icons, status badges,
  loading/empty states, and the required `SimuladoBadge`.
- Added semantic design tokens, dark-mode tokens, a Tailwind-compatible theme
  configuration, safe-area spacing, and 48-pixel minimum controls.
- Updated the PWA metadata to Resgata and preserved generated service-worker,
  install, update, offline, and SPA navigation behavior.
- Added local Oxlint rules plus a deterministic boundary checker. It enforces
  `app -> features -> shared`, prevents upward imports, and requires feature
  consumers to use public `index.ts` boundaries.

## Explicit Phase 3 placeholders

The routed shell intentionally renders a visible foundation placeholder until
the owning feature supplies its route element:

- `/doar`: `vision` + `donations`;
- `/minhas-doacoes`: `donations`;
- `/ong/ofertas`: `offers`;
- `/ong/recebimentos`: `pickups`;
- `/coleta`: `pickups`;
- `/cupons`: `coupons`;
- `/painel`: `impact` + `donations`;
- `/parceiro`: `partner`;
- `/admin/queues`: `admin`.

`RouterProvider` accepts route elements keyed by the exported `RouteId`, so
feature screens can replace placeholders without moving guard or shell logic
into feature pages.

## Verification

Passed from `apps/web`:

```bash
./node_modules/.bin/tsc -b --pretty false
./node_modules/.bin/vite build
./node_modules/.bin/oxlint -c .oxlintrc.json src
node scripts/check-boundaries.mjs
./node_modules/.bin/vitest run
```

Results:

- TypeScript project build passed.
- Vite production and PWA generation passed.
- Service worker generated with 13 precache entries.
- Boundary check passed for 51 source files.
- 4 test files and 9 tests passed.

Preview checks passed:

- `/entrar` returned the production SPA with title `Resgata`;
- `/painel` returned the same SPA fallback;
- the manifest reported `Resgata`, `pt-BR`, `standalone`, and four icons.

## Remaining gaps

- Feature implementations and their TanStack Query hooks remain Phase 3.
  `QueryBridgeProvider` is the injection seam for the future QueryClient
  invalidator; no competing cache was introduced.
- The offline provider exposes a queue bridge and reconnect synchronization,
  but IndexedDB persistence/replay belongs to the `offline` feature.
- SSE behavior was unit-tested at decoder and invalidation-mapping level.
  End-to-end live event verification requires the API service.
- Camera, GPS, QR, and real feature loading/empty/error flows belong to their
  feature owners.
- The Tailwind-compatible token configuration is present, while the current
  scaffold continues compiling the same tokens as plain CSS because no
  Tailwind runtime dependency exists in the frozen workspace dependencies.

## Assumptions

- Phase 3 feature agents will expose route elements through each feature's
  public `index.ts`.
- The API remains mounted at `/api`; `VITE_API_BASE_URL` can override it.
- Seed demo keys remain `seller-padaria-cambui`, `ngo-prato-solidario`,
  `driver-ana`, and `partner-cafe-local`.

## Contract change requests

None. Adding TanStack Query or Tailwind runtime packages must be coordinated
with the orchestrator because the root lockfile is outside web-core ownership.

## Stable downstream interfaces

- Providers: `apps/web/src/app/providers/index.ts`.
- Router contract: `apps/web/src/app/router/index.ts`.
- Shared UI: `apps/web/src/shared/ui/index.ts`.
- API client: `apps/web/src/shared/api/index.ts`.
- SSE transport: `apps/web/src/shared/sse/index.ts`.
- Query invalidation contract: `apps/web/src/shared/query/index.ts`.
- Offline queue bridge: `OfflineQueueBridge`.
- Required simulated marker: `SimuladoBadge`.
