---
name: resgata-multi-agent
description: Coordinate parallel implementation of the Resgata monorepo using its fixed path ownership, contract freeze, handoff, merge, and phase-gate rules. Use when assigning, executing, reviewing, or integrating Resgata agent work; do not use for unrelated multi-agent projects.
---

# Resgata Multi-Agent Coordination

Apply these rules when work is divided across Resgata agents or when reviewing
their branches.

## Establish the current phase

Do not dispatch work merely because its owner is known. First identify the last
phase whose gate passed:

1. Skeleton: the monorepo installs and isolated worktrees exist.
2. Contracts: shared types, schemas, migrations, seed, OpenAPI, and domain
   primitives pass their gate; then tag `contracts-v0` and freeze them.
3. Foundations: Infra, API, Workers, and Web-core may run in parallel against
   the frozen contracts.
4. Features: feature agents may start only after the foundation gate passes.
5. Integration: QA and the Orchestrator exercise the composed system.

A failed gate blocks later phases. Within a phase, merge in this order:
Contracts, Infra, API, Workers, Web-core, feature agents, Offline, then QA.
The Orchestrator runs the phase gate after every merge. If it fails, revert
that merge and return the exact failure to its owner; do not stack another
merge on top of it.

## Enforce exclusive ownership

Each agent edits only its owned paths in its own branch and worktree:

| Agent | Exclusive paths |
|---|---|
| Orchestrator | `AGENTS.md`, `docs/**`, root `package.json`, `pnpm-workspace.yaml`, lockfile, merges, `scripts/smoke.sh` |
| Contracts | `packages/shared/**`, `db/migrations/**`, `db/seed/**`, `docs/openapi.yaml` |
| Infra | `docker-compose.yml`, `Makefile`, `.env.example`, `infra/**`, `services/mocks/**` |
| API | `services/api/**` |
| Workers | `services/workers/**` |
| Web-core | `apps/web/src/app/**`, `apps/web/src/shared/**`, Tailwind configuration, PWA setup, design system |
| Web-seller | `apps/web/src/features/vision/**`, `apps/web/src/features/donations/**`, `apps/web/src/features/session/**` |
| Web-field | `apps/web/src/features/offers/**`, `apps/web/src/features/pickups/**`, `apps/web/src/features/coupons/**` |
| Web-dash | `apps/web/src/features/impact/**`, `apps/web/src/features/partner/**`, `apps/web/src/features/admin/**` |
| Offline | `apps/web/src/features/offline/**` |
| QA | service `**/*.test.*`, `tests/e2e/**`, concurrency, idempotency, and fallback tests |

Reject an out-of-scope branch instead of cherry-picking selected changes.
When two agents need the same file, its owner implements the change and the
consumer waits for the merge. Feature agents must request missing shared UI
from Web-core rather than create local copies.

Root dependency metadata is intentionally centralized. Agents may edit only
their package-local `package.json`; the Orchestrator updates the root manifest
and regenerates the lockfile during integration.

## Keep contracts frozen

Only Contracts may establish shared types, schemas, migrations, seed data, and
OpenAPI before the freeze. Foundation and feature agents must consume that
version rather than alter it.

After `contracts-v0`, any required contract change must be appended to
`docs/contract-changes.md` with:

- requester;
- requested change;
- reason;
- affected consumers and migration impact.

The Orchestrator alone approves the request, applies or coordinates the change
in `packages/shared/**`, `db/**`, or `docs/openapi.yaml`, increments the
contract version, and tells every affected owner to rebase or adapt. A consumer
must not patch a shared contract to unblock itself.

## Require a verifiable handoff

Before integration, every agent writes `docs/handoffs/<agent>.md` containing:

- completed work and exact verification commands;
- unfinished, simulated, or stubbed behavior;
- assumptions made without confirmation;
- unresolved contract-change requests;
- operational facts needed downstream, including ports, environment variables,
  and seed identifiers.

The Orchestrator reads the handoff before merging and rejects it when missing
or when its verification commands fail. Because `docs/**` belongs to the
Orchestrator, treat the handoff as the agent's integration artifact: if branch
ownership enforcement prevents a direct edit, send the complete handoff
content to the Orchestrator for placement rather than silently omitting it.

## Apply the phase gates

- Contracts gate: `pnpm -r typecheck`; migrations apply to a clean Postgres;
  seed loads; state-machine, matching, and haversine unit tests pass.
- Foundations gate: `docker compose up --build` is healthy; `/health` responds;
  a worker consumes a test message; both web layouts render with the design
  system.
- Features gate: each feature works against the real API in Compose and lint
  boundaries pass.
- Integration gate: `scripts/smoke.sh` passes the happy path, timeout fallback
  with `OFFER_TIMEOUT_SECONDS=5`, concurrent acceptance with exactly one
  winner, idempotent replay with exactly one donation, and the same smoke under
  `make lite`.

Reading code or passing host-only tests does not satisfy a Compose or
integration gate. Simulated behavior must be visibly labeled `SIMULADO`.

## Handle constrained delivery

If scope must be cut for time, remove work in this order: Offline, Web-dash
partner/admin screens, coupons. Preserve the core flow:
post, match, accept, collect, deliver, dashboard.

When an emulator lacks a required capability, record the gap in the handoff.
For unsupported scheduled-message behavior, route that path through the `pg`
driver and have Infra or Workers document the known gap; do not hide the
limitation behind a passing mock.
