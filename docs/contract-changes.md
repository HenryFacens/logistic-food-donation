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
