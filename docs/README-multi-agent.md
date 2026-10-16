# Multi-agent delivery

Contracts are frozen before parallel work. Agents have disjoint file ownership,
record assumptions in handoffs, and merge only after their phase gate passes.

| Phase | Work | Gate |
|---|---|---|
| 0 | workspace skeleton and agent rules | workspace installs |
| 1 | shared package, migrations, seed, OpenAPI | typecheck, tests, clean migration and seed |
| 2 | infra, API, workers, web core | healthy stack and basic message flow |
| 3 | web features and offline behavior | routes work against the real API |
| 4 | integrated QA | happy path, fallback, concurrency, idempotency, lite mode |

Append contract requests to `docs/contract-changes.md` with requester, change,
reason, and impact. Only the orchestrator changes frozen contracts.

Merge in this order: Contracts, Infra, API, Workers, Web core, Web features,
Offline, QA. A failing gate blocks the next phase.
