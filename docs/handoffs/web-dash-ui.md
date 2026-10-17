# Web dashboard UI handoff

## Completed

- Redesigned the producer impact dashboard using real delivered-weight metrics
  and visibly labeled estimates.
- Redesigned the partner dashboard around coupon conversion, campaign impact,
  traceability, and explicit fiscal limitations.
- Redesigned the admin dashboard around real queue health while preserving
  dead-letter filtering, payload inspection, and replay.

## Verification

```text
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web typecheck
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web test
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web lint
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web build
COMPOSE_PROFILES=azure docker compose up -d --build web
```

## Remaining gaps

- Fiscal, sales, ESG, reputation, and platform-wide historical metrics remain
  unavailable unless already represented by the current endpoints.
- The existing broad authorization for `/admin/queues` was not changed by this
  interface-only delivery.

## Operational facts

- Gateway: `http://localhost:8080`
- Web direct port: `http://localhost:5173`
- The rebuilt `web` and existing `gateway` services were healthy after QA.

## Contract changes requested

- None applied.

## Metrics extension

### Completed

- Added the independent `/plataforma` profile and global operation dashboard.
- Restricted `/admin/queues` to platform operators.
- Added shared dashboard components that preserve evidence labels:
  recorded, calculated, estimated, and unavailable.
- Kept the sponsor as an independent `/patrocinador` profile with campaign,
  commercial, ESG, and documentation views.

### Verification

```text
Platform dashboard live HTTP check: 200
Platform queue access: 200
Seller queue access: 401
Shared dashboard components and view models covered by the 71-test web suite
```
