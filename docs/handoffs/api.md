# API foundation handoff

## Completed

- Added an Azure Functions v4, Node 20, TypeScript HTTP application under
  `services/api`.
- Implemented all canonical OpenAPI routes:
  - health, demo users, and current demo user;
  - deterministic vision proxy/fallback;
  - donation create/list/detail/events;
  - offer list/accept/decline;
  - pickup list/assign/collect/deliver;
  - coupon list/redeem;
  - seller impact/forecast and partner dashboard;
  - queue dashboard, dead letters, replay, and resumable SSE.
- Added requested non-OpenAPI extensions:
  - `GET /api/ngos`;
  - `GET /api/partner/redemptions`;
  - `POST /api/dev/reset`, gated by `ENABLE_DEV_RESET=true`.
- Mutation handlers use `Idempotency-Key`, stable request hashes, PostgreSQL
  transactions, correlation IDs, canonical `idempotency_keys`, `events`,
  `outbox`, `jobs`, `notifications`, and `redemptions` tables.
- Offer acceptance calls the canonical `accept_offer` compare-and-set function.
  Pickup collection and delivery call `transition_donation`.
- Added focused tests for opaque pagination, stable idempotency hashing, and
  deterministic pt-BR vision fallback.
- Added a service Dockerfile, Functions host configuration, and local settings
  example.

## Verification

Passed:

```bash
cd services/api
./node_modules/.bin/tsc -p tsconfig.json --noEmit
./node_modules/.bin/tsc -p tsconfig.build.json
./node_modules/.bin/vitest run
```

Result: 3 test files and 5 tests passed.

Passed:

```bash
git diff --check -- services/api docs/handoffs/api.md
```

## Missing endpoints

None from `docs/openapi.yaml` or the API-agent brief.

## Remaining gaps

- HTTP handlers were not exercised through a running Azure Functions host.
- Database-backed happy path, concurrent offer acceptance, and full
  idempotent replay still require the integration/QA phase against a disposable
  seeded database.
- SSE is a bounded resumable event response with reconnect instructions, not a
  permanently held database-notification stream.
- The Service Bus queue dashboard reports canonical PostgreSQL outbox/job
  state; it does not query emulator management metrics.
- The root lockfile was intentionally not changed. The orchestrator must run
  the workspace install and commit the resulting `services/api` importer before
  using a frozen-lockfile container build.

## Assumptions

- `X-Demo-User` remains the only authentication mechanism.
- Queue administration is available to any valid demo user, matching the web
  architecture reference.
- `POST /api/dev/reset` preserves deterministic seed entities and removes only
  runtime state.
- Vision uses `VISION_API_URL` when supplied, otherwise the Compose-standard
  `OPENAI_BASE_URL`.

## Stable runtime values

- Functions route prefix: `/api`.
- Default database pool size: 10.
- Default queue driver: `servicebus`.
- Default vision timeout: 5000 ms.
- Dev reset flag: `ENABLE_DEV_RESET`.

## Metrics extension — API 0.2

### Completed

- Added seller, driver, NGO, and platform dashboard endpoints.
- Added independent NGO receipt confirmation:
  `POST /api/pickups/{pickupId}/receipt`.
- Added seller/NGO driver ratings and seller rating opportunities.
- Added donation financial inputs and delivery deadlines used by punctuality
  metrics.
- Restricted queue administration and dev reset to the `platform` role.
- Preserved idempotent writes and atomic state validation for receipts and
  ratings.
- Dashboard values expose their evidence type. Missing inputs return
  `unavailable`; the API does not invent a fiscal percentage or CO2e factor.

### Verification

```text
API typecheck and build: passed
API tests: 3 files, 5 tests passed
Live dashboard HTTP checks: seller, driver, NGO, and platform returned 200
Live authorization check: platform queues 200; seller queues 401
Live seed counts: 32 receipts and 53 ratings
```
