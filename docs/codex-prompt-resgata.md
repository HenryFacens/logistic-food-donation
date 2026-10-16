# Resgata product contract

Resgata dispatches perishable food surplus to an NGO in minutes, automatically
trying the next destination when an offer expires.

## Scope

Roles are `seller`, `ngo`, `driver`, and `partner`. Authentication is a demo
role picker that sends `X-Demo-User`; real authentication is out of scope.

| Azure instance | Compose service | Local implementation |
|---|---|---|
| `swa-resgata-web` | `web` | React, Vite, Tailwind, PWA |
| `apim-resgata` | `gateway` | nginx gateway |
| `func-resgata-api` | `api` | Azure Functions v4, Node/TypeScript |
| `func-resgata-workers` | `workers` | Azure Functions workers |
| `psql-resgata` | `postgres` | PostgreSQL with PostGIS |
| `stresgata` | `azurite` | Azurite Blob and Functions storage |
| `sbns-resgata` | `servicebus`, `mssql` | Service Bus emulator and SQL Server |
| `oai-resgata` | `mock-openai` | deterministic vision mock |
| `maps-resgata` | `mock-maps` | haversine route mock |
| `acs-resgata` | `mock-acs` | inspectable WhatsApp/SMS outbox |
| `sigr-resgata` | inside `api` | server-sent events |

Queues are `donation.created`, `donation.classified`, `offer.sent`,
`offer.timeout`, and `pickup.confirmed`.

## Non-negotiable behavior

- TypeScript and pnpm workspaces; runtime containers use Node 20.
- Fictional pt-BR Campinas/SP data is seeded into one PostgreSQL database.
- Simulated forecast, ROI, sponsor, and historical data is labeled `SIMULADO`.
- `POST /donations` requires `Idempotency-Key`.
- Donation transitions are atomic compare-and-set updates and write an event
  carrying `correlation_id`.
- Donation creation uses a transactional outbox. Consumers are idempotent and
  support retry/backoff plus a dead-letter path.
- Matching is explainable: distance, NGO capacity, perishability versus ETA,
  and category need are returned as a score breakdown.
- Fallback order is next NGO, paid freight placeholder, then
  `no_destination`.
- `OFFER_TIMEOUT_SECONDS` defaults to 30.
- Messaging is behind `MessageBus`, with Service Bus and PostgreSQL drivers.
  Scheduling is behind `Scheduler`; PostgreSQL is allowed when the emulator
  cannot schedule.

## Donation lifecycle

`posted -> classified -> offered -> accepted -> collected -> delivered`, with
terminal alternatives `expired` and `no_destination`.

## API and web

The canonical API is `docs/openapi.yaml`. The web app has mobile layouts for
seller/NGO/driver and desktop layouts for seller dashboards, partners, and
queue administration. It includes offline donation replay, camera/GPS
fallbacks, QR flows, SSE, and loading/empty/error states.

## Exclusions

Do not add real auth, payments, ML training, Kubernetes, volunteer marketplace,
or broad gamification.

## Acceptance gates

- Full Compose and lite PostgreSQL-queue stacks work.
- Seed/reset are repeatable.
- Happy path, fallback, concurrent accept, and idempotent replay pass.
- Shared state machine, matching, and haversine tests pass.
- The PWA builds and phone HTTPS exposure is documented.
