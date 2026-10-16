# Workers handoff — Phase 2

## Completed

- Added an Azure Functions v4, Node 20, TypeScript worker package under
  `services/workers`.
- Added a shared `MessageBus` interface with:
  - PostgreSQL driver using canonical `outbox` rows as the runnable lite queue;
  - Service Bus driver using the same envelope and consumer contract.
- Added a PostgreSQL scheduler using canonical `jobs.run_at`.
- Added a transactional outbox relay for Service Bus mode. In PostgreSQL mode,
  consumers claim `outbox` directly with `FOR UPDATE SKIP LOCKED`.
- Added transactional consumer idempotency through `processed_messages`.
- Added capped exponential retry, delayed retry, and dead-letter handling.
- Added deterministic classification and atomic donation transitions.
- Added PostGIS NGO prefiltering and the shared explainable matching score.
- Added sequential NGO offers, timeout jobs, decline-compatible fallback,
  simulated paid-freight fallback, and terminal `no_destination` handling.
- Added canonical `events` writes for repeated offers.
- Added offer and pickup notification creation in canonical `notifications`.
- Added an ACS dispatcher that locks canonical `notifications`, sends through
  the ACS SDK or mock HTTP endpoint, retries with backoff, and marks terminal
  notification failures as `dead_letter`.
- Added an Azure Functions timer bootstrap, Dockerfile, and focused tests.

## Canonical table compliance

Worker writes, locks, and conflict handling use `users`, `events`, `outbox`,
`jobs`, and `notifications`. Compatibility views such as `demo_users`,
`donation_events`, `outbox_messages`, and `scheduled_messages` are not used by
worker SQL.

## Verification

Passed:

```bash
cd services/workers
../../packages/shared/node_modules/.bin/tsc -p tsconfig.json --noEmit
../../packages/shared/node_modules/.bin/tsc -p tsconfig.json
node --test dist/tests/*.test.js
```

Result: 5 test files and 8 tests passed.

Passed:

```bash
rg -n "demo_users|donation_events|idempotency_records|outbox_messages|scheduled_messages|coupon_redemptions|scheduled_for" \
  services/workers/src services/workers/tests services/workers/Dockerfile
git diff --check -- services/workers docs/handoffs/workers.md
```

Result: no compatibility-view SQL references and no whitespace errors.

The Docker build completed dependency installation and TypeScript compilation
for `@resgata/shared` and `@resgata/workers`. The run was interrupted while
downloading the final Azure Functions base-image layers, so final image
assembly and container startup are not claimed as verified.

## Remaining gaps

- No end-to-end PostgreSQL flow was executed against a clean database in this
  handoff; SQL behavior still needs the Phase 2 integration gate.
- Service Bus publish/receive, settlement, retry, and dead-letter behavior
  compiled but was not exercised against the emulator.
- ACS SDK delivery was not exercised. The local mock path requires the mock
  service to honor `Idempotency-Key`.
- The Service Bus emulator is non-persistent, has no AMQP WebSockets or Entra
  ID, and is unsuitable for production behavior claims.
- PostgreSQL remains the scheduler in both queue modes because emulator
  scheduling is not a supported dependency.
- `notifications` has no dedicated next-attempt column. The dispatcher stores
  `nextAttemptAt` in its JSON payload and filters failed rows by that value.
- Root `pnpm-lock.yaml` was not changed due to worker ownership boundaries.
  The orchestrator must refresh the workspace lockfile before a frozen install.

## Assumptions

- `offer.timeout` is also the asynchronous continuation signal after an API
  decline; a declined offer advances immediately rather than waiting again.
- `pickup.confirmed` payloads contain `pickupId`.
- `offer.sent` payloads contain `offerId`.
- Notification rows are the durable boundary before ACS delivery.
- Actual ACS delivery is at least once; the mock receives the notification UUID
  as its idempotency key.

## Contract change requests

None.

## Stable runtime values

- `QUEUE_DRIVER`: `pg` or `servicebus`; default is `servicebus`.
- `OFFER_TIMEOUT_SECONDS`: default `30`.
- `MAX_DELIVERY_ATTEMPTS`: default `5`.
- `WORKER_BATCH_SIZE`: default `10`.
- PostgreSQL: local Compose port `5432`.
- ACS mock: local Compose port `4012`.
- Required database setting: `DATABASE_URL`.
- Service Bus mode setting: `SERVICE_BUS_CONNECTION_STRING`.
- Notification settings: either `ACS_MOCK_URL`, or
  `ACS_CONNECTION_STRING` plus `ACS_SENDER`.
- Queues: `donation.created`, `donation.classified`, `offer.sent`,
  `offer.timeout`, and `pickup.confirmed`.
