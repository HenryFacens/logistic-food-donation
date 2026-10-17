# Contract change requests

## Applied: canonical persistence names

- Requester: Orchestrator
- Change: Use required tables `users`, `events`, `idempotency_keys`, `outbox`,
  `jobs(run_at)`, `notifications`, and `redemptions`.
- Reason: Phase 1 initially used semantically equivalent internal names and
  omitted `notifications`, which did not satisfy the product schema contract.
- Impact: API and workers must use canonical tables for writes and conflict
  handling. Read/write compatibility views preserve the initial names during
  foundation integration.
- Status: approved and applied before the foundation gate.

## Applied: expose the selected role profile identifier

- Requester: Web-dash integration
- Change: `GET /me` also returns `profileId`, the selected seller, NGO, driver,
  or partner profile UUID.
- Reason: Partner-scoped routes use a profile UUID, while the original demo
  identity response exposed only the user UUID.
- Impact: The response remains backward compatible; partner consumers can call
  `/partners/{partnerId}/redemptions` without guessing or querying persistence.
- Status: approved and applied during the feature gate.

## Applied: donation detail timeline and explicit NGO selector

- Requester: final contract audit
- Change: `GET /donations/{donationId}` includes an ordered `timeline`, and
  `GET /offers` accepts the documented optional `ngoId` query parameter.
- Reason: the product prompt required both shapes explicitly while the initial
  implementation exposed only the dedicated events endpoint and inferred the
  NGO exclusively from `X-Demo-User`.
- Impact: donation detail is backward compatible because existing donation
  fields remain top-level; `ngoId`, when provided, must match the authenticated
  demo NGO profile.
- Status: approved and applied before the final gate.

## Applied: driver pickup summary, kg-based rewards, and redacted proof codes

- Requester: web-field (driver available deliveries screen)
- Change:
  - `Pickup` gains an optional `summary` (`PickupSummary`) with category,
    description, weight, quantity/unit, `expiresAt`, seller and NGO names and
    addresses, `routeDistanceKm`, `distanceToPickupKm` (driver only, else
    null), and `rewardPoints`. `GET /pickups` always returns it.
  - Reward points move to `@resgata/shared` (`COLLECTION_REWARD_POINTS = 25`,
    `calculateRewardPoints(weightKg) = 10 + round(weightKg)` on delivery,
    `calculateTotalRewardPoints`). The API credits these values and
    `summary.rewardPoints` shows the same total. Previously: +25 / +50 fixed.
  - `pickupCode` and `deliveryCode` become optional and are omitted from every
    driver response (list, assign, collect, deliver). NGO responses keep them.
  - `GET /me` returns optional `capacityKg` for drivers
    (`currentDemoUserSchema` in shared).
- Reason: drivers could not choose deliveries from ids and coordinates; fixed
  points rewarded small runs; any driver received proof codes for pickups that
  were not theirs.
- Impact: additive for consumers except code redaction. Before the change the
  web never rendered codes to drivers, and `scripts/smoke.sh` reads them from
  the NGO response, so nothing that worked depends on the driver copy. Known
  gap (pre-existing): no screen shows `pickupCode` to the seller; see
  `docs/handoffs/api.md`.
- Status: approved and applied for the hackathon demo.

## Applied: itemized pickups and delivery deadline

- Requester: web-field (driver deliveries screen)
- Change:
  - Migration `db/migrations/003_donation_items.sql` adds
    `donations.items jsonb NOT NULL DEFAULT '[]'` (array of
    `{ name, quantity, unit }`). Mounted in Compose as `025-donation-items.sql`.
  - `PickupSummary` gains `items` (`PickupItem[]`, empty when the seller only
    gave a description) and `deliverBy` =
    `GREATEST(expiresAt, availableFrom + perishabilityMinutes)`.
  - The open-pickups demo seed lists items per donation (weights sum to the
    donation weight) and a delivery window 60–240 min after the pickup
    deadline.
- Reason: drivers need to know exactly what they carry and when the NGO must
  receive it, not just a generic description and total weight.
- Impact: additive. Existing databases need the migration applied (or
  `make reset`); donations created through the form keep `items = []` and the
  driver UI falls back to description + total weight.
- Status: approved and applied for the hackathon demo.
