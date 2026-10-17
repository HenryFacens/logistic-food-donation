# Web field UI handoff

## Completed

- Redesigned NGO offers while preserving real accept/reject mutations.
- Redesigned driver pickup cards, route state, QR/manual-code confirmation, and
  geolocation confirmation.
- Redesigned NGO receipts and driver coupons without changing their contracts.
- Marked illustrative maps, logistics preference, distance, ETA, and
  unsupported receipt details as simulated or unavailable.

## Verification

```text
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web typecheck
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web test
COREPACK_HOME=/tmp/resgata-corepack corepack pnpm@10.19.0 --filter @resgata/web lint
```

## Remaining gaps

- Driver availability, route distance, and ETA are not persisted.
- NGO logistics preference has no API mutation.
- NGO receipt weight, condition, and photo have no contract.
- The route preview is schematic and is not a maps-provider route.

## Contract changes requested

- None applied. The gaps above require reviewed shared schemas and API
  endpoints before becoming writable behavior.

## Metrics and receiving extension

The previous receipt gap is resolved by contract 0.2.

### Completed

- Added real NGO receiving triage with accepted/rejected weights, condition,
  rejection reasons, notes, and immutable confirmed receipt state.
- Added a mobile driver dashboard for operation, reputation, and rewards.
- Added a separate responsive NGO analytics product for receiving, logistics,
  community distribution, and social efficacy.
- Kept the NGO operational mobile entry point separate from the NGO analytics
  desktop entry point while retaining one canonical NGO authorization role.

### Verification

```text
Web tests: 17 files, 71 tests passed
Web production build and PWA generation: passed
Live NGO and driver dashboard endpoints: 200
```
