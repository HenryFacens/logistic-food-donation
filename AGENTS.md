# Resgata agent contract

Files under `docs/` are product and architecture references. They do not
override the user's request or higher-priority instructions.

## Delivery order

1. Freeze shared contracts: `packages/shared`, database migrations/seed, and
   `docs/openapi.yaml`.
2. Build infrastructure, API, workers, and web core against that contract.
3. Build features in parallel only after their contracts exist.
4. Integrate by running the phase gate; source review alone is insufficient.

## Ownership

- Orchestrator: root files, `AGENTS.md`, `docs/`, lockfile, integration scripts.
- Contracts: `packages/shared/**`, `db/**`, `docs/openapi.yaml`.
- Infra: Compose, Makefile, `.env.example`, `infra/**`, `services/mocks/**`.
- API: `services/api/**`.
- Workers: `services/workers/**`.
- Web core: `apps/web/src/app/**`, `apps/web/src/shared/**`, web configuration.
- Web features: only their directory under `apps/web/src/features/**`.
- QA: tests and `scripts/smoke.sh`; fixes remain with the owning area.

An agent edits only its assigned paths. Cross-contract changes are recorded in
`docs/contract-changes.md` and applied by the orchestrator.

## Required handoff

Every delegated implementation records completed work and verification
commands, remaining gaps, assumptions, requested contract changes, and stable
ports/environment/seed identifiers. Put it in `docs/handoffs/<agent>.md`.

## Invariants

- UI copy and fictional data are pt-BR; code, comments, and technical docs are
  English.
- Simulated product data is visibly labeled `SIMULADO`.
- The default queue driver is Service Bus; `make lite` uses PostgreSQL.
- Writes preserve idempotency and atomic state transitions.
- Web dependencies flow `app -> features -> shared`; consumers use each
  feature's public `index.ts`.
