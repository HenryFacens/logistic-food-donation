# Web seller UI handoff

## Completed

- Redesigned `/doar` around the guided item confirmation flow.
- Preserved image/manual classification, offline publication, and idempotency.
- Redesigned `/minhas-doacoes` with urgency, expandable real event timelines,
  and an explicit notice that producer QR/pickup codes are not in the contract.

## Verification

```text
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web typecheck
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web test
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web lint
```

## Remaining gaps

- No producer-facing QR or pickup-code field exists in the shared/API contract.
- Donation detail remains an expandable list state rather than a parameterized
  route.
- The selected classification photo is not persisted with the donation.

## Contract changes requested

- None applied. A future producer pickup credential would require a reviewed
  shared schema and API change.

## Metrics extension

### Completed

- Added the mobile `/metricas` dashboard with donation, fiscal/financial, and
  loyalty sections.
- Added the mandatory fiscal limitation notice.
- Added post-receipt evaluation of the transportador/coletor with score, tags,
  and optional comment.
- Added optional declared unit value and avoided disposal cost to publication,
  preserving offline publication and idempotency.

### Verification

```text
Web typecheck, lint, boundaries, tests, and production build: passed
Seller dashboard and rating contracts parsed from the live API
```
