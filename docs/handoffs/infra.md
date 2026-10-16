# Infra handoff — Phase 2

## Completed

- Added full and lite Compose topologies.
  - Full mode enables the `azure` profile and uses the Service Bus driver.
  - Lite mode omits `servicebus` and `mssql` and sets `QUEUE_DRIVER=pg`.
- Pinned every prescribed runtime image from `docs/emulator-notes.md`.
- Mounted PostgreSQL/PostGIS migrations and deterministic seed in initialization
  order.
- Added repeatable `seed`, full reset, and lite reset Make targets.
- Added nginx gateway routing for the web app, API, health endpoint, and
  unbuffered SSE.
- Added the five frozen queue names to Service Bus `Config.json`.
- Added healthchecks for gateway, web, API, workers, PostgreSQL, Azurite,
  Service Bus, SQL Server, and all mocks.
- Added deterministic TypeScript Fastify mocks for:
  - canonical and OpenAI-compatible vision classification;
  - Haversine distance and ETA;
  - inspectable WhatsApp/SMS outbox.
- Added multi-stage Dockerfiles for web, API, workers, mocks, and the Service
  Bus health probe.

## Verification

Passed on 2026-10-16:

```bash
COMPOSE_PROFILES=azure QUEUE_DRIVER=servicebus docker compose config --quiet
COMPOSE_PROFILES= QUEUE_DRIVER=pg docker compose config
npm --prefix services/mocks run typecheck
npm --prefix services/mocks test
docker compose up -d --build mock-openai mock-maps mock-acs
make seed
git diff --check -- docker-compose.yml Makefile .env.example infra services/mocks docs/handoffs/infra.md
```

Results:

- Full config contains `servicebus` and `mssql`, with
  `QUEUE_DRIVER=servicebus`.
- Lite config excludes `servicebus` and `mssql`, with `QUEUE_DRIVER=pg`.
- Mock typecheck passed; 3/3 focused tests passed.
- Node 20 mock images built with zero reported production dependency
  vulnerabilities.
- PostgreSQL, Azurite, gateway, and all three mocks reached `healthy`.
- Live mock requests passed for classification, route calculation, message
  submission, and outbox inspection.
- PostgreSQL contains canonical `users`, `events`, `idempotency_keys`,
  `outbox`, `jobs`, `notifications`, and `redemptions` tables.
- Seed counts were 18 users and 40 donations. A second seed run inserted zero
  rows.
- Service Bus `Config.json` is valid JSON and contains all five frozen queues.

## Remaining gaps

- The orchestrator must regenerate the root `pnpm-lock.yaml` after integrating
  `@resgata/mocks`; Infra did not modify the root lockfile.
- The interrupted Service Bus image pull/build did not produce a local image.
  Service Bus, SQL Server, API, workers, web, and the complete full/lite stacks
  were not started together; their runtime health remains unverified.
- The official Service Bus JSON schema could not be executed with the local
  AJV validator because one schema regex is rejected in Unicode mode. This is
  a validator/schema compatibility gap, not a successful schema validation.
- Browser, phone, and end-to-end SSE behavior remain integration checks.

## Assumptions

- Azure Functions expose HTTP on container port 80 and retain the default
  `/api` route prefix.
- API and workers package names are `@resgata/api` and `@resgata/workers`.
- PostgreSQL implements deterministic scheduling in both modes; Service Bus is
  transport only.
- The Service Bus image is distroless. The local derivative copies a Node 20
  probe into the pinned emulator image solely to call its management health
  endpoint.

## Contract change requests

None.

## Stable operational facts

- Gateway: `http://localhost:8080`
- Direct API: `http://localhost:7071`
- Direct web: `http://localhost:4173`
- PostgreSQL: `localhost:5432`, database/user `resgata`
- Azurite Blob/Queue/Table: `10000`/`10001`/`10002`
- Service Bus AMQP/management: `5672`/`5300`
- SQL Server: `1433`
- OpenAI/maps/ACS mocks: `4010`/`4011`/`4012`
- Queue names: `donation.created`, `donation.classified`,
  `offer.sent`, `offer.timeout`, `pickup.confirmed`
- Default timeout: `OFFER_TIMEOUT_SECONDS=30`
- Full: `make up` or `make full`
- Lite: `make lite`
- Repeat seed: `make seed`
- Destructive clean resets: `make reset`, `make reset-lite`
