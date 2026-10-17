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

## 2026-10-16: pickup summary, kg-based rewards, proof-code redaction

### Completed

- `GET /pickups` joins donation, seller, and NGO (`pickupSummarySelect` +
  `pickupSummaryJoins` in `mappers.ts`) and returns `summary`: category,
  description, weight, quantity/unit, `expiresAt`, names and addresses,
  `routeDistanceKm` (`ST_Distance(pickup, delivery) / 1000`),
  `distanceToPickupKm` (requesting driver's `current_location`, null for
  NGOs), `rewardPoints`.
- Rewards come from `@resgata/shared`: `COLLECTION_REWARD_POINTS` (25) on
  collect and `calculateRewardPoints(kg) = 10 + round(kg)` on deliver, using
  `donations.estimated_weight_kg`. `summary.rewardPoints` =
  `calculateTotalRewardPoints(kg)`, so the card equals the credit (verified
  in the demo: +40 shown, +40 credited).
- `GET /me` returns `capacityKg` for drivers.
- `POST /dev/reset` also calls `reset_demo_open_pickups()` (defined in the
  seed) to recreate five open deliveries with deadlines relative to now.
  Databases seeded before this change skip that call.
- Tests: `tests/pickup-mapper.test.ts` (redaction, summary, reward rule),
  `packages/shared/tests/reward-points.test.ts`.

### Proof codes: decision

- How the demo shows them today: the NGO sees `deliveryCode` on
  `/ong/recebimentos`. **No screen shows `pickupCode`**, neither to the
  seller nor to anyone else; before this change it reached only the API
  response of NGOs and drivers, and the driver UI never rendered it.
- Applied: codes are omitted from **every driver response** (list, assign,
  collect, deliver). NGO responses keep both. Nothing that worked broke:
  the driver UI never read them, and `scripts/smoke.sh` reads codes from the
  NGO response.
- Open (pre-existing, not invented here): during the demo the presenter
  needs the pickup code from outside the UI, for example
  `curl -s localhost:8080/api/pickups -H 'X-Demo-User: ngo-prato-solidario' | jq '.items[] | {donationId, pickupCode}'`.
  Seeded open deliveries use fixed codes: pickup `410101`–`410105`, delivery
  `520101`–`520105` (suffix = seed sequence 101–105). Proper fix: show
  `pickupCode` to the seller on "Minhas doações" once a pickup exists, which
  needs seller read access to its donation's pickup.

### Stable identifiers

- Open demo deliveries: donations `30000000-0000-4000-8000-000000000101`…`105`,
  pickups `33000000-0000-4000-8000-000000000101`…`105`. Weights 18, 42, 9,
  120, 260 kg; deadlines 50 min, 95 min, 3 h, 5 h, 8 h after seed/reset.
  `driver-ana` capacity 350 kg (120 + 260 exceeds it).

### Verification

```bash
pnpm --filter @resgata/api typecheck && pnpm --filter @resgata/api test
make reset-lite && make smoke-lite
```
