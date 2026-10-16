# Feature boundaries and public APIs

## Dependency contract

| Importer | May import | Must not import |
|---|---|---|
| `app/**` | feature public APIs, `shared/**`, `packages/shared` | feature internals |
| `features/<owner>/**` | its own internals, `shared/**`, `packages/shared`, another feature's `index.ts` | `app/**`, another feature's internal path |
| `shared/**` | other `shared/**`, `packages/shared` | `features/**`, `app/**` |

Treat feature-to-feature imports as a narrow exception to the primary one-way dependency rule. They must go through `features/<target>/index.ts`, must not form cycles, and should disappear into `shared` or a merged feature when coupling becomes recurrent.

## Ownership and placement

The expected feature anatomy is:

```text
features/<name>/
├─ api/          # TanStack Query read and mutation hooks; only network callers
├─ components/   # rendering and interaction, without direct fetching
├─ hooks/        # feature logic that is not data fetching
├─ pages/        # thin layout-independent composition
├─ model/        # UI view models and API-to-UI mappers
├─ messages.ts   # pt-BR feature copy
├─ routes.tsx    # lazy-loadable route objects
└─ index.ts      # complete external API
```

Placement decisions:

- Keep code in its owning feature until it is genuinely neutral and reused by at least two features.
- Move reusable visual primitives to `shared/ui`; do not duplicate them.
- Put maps, QR primitives, fetch/error infrastructure, generic hooks, formatting, and environment constants in their corresponding `shared` area.
- Keep backend contract types, Zod schemas, domain state machines, and matching-score logic in `packages/shared`.
- Export only stable cross-boundary contracts from `index.ts`. Internal file organization must remain replaceable without changing consumers.
- Import a feature's `routes.tsx` through its `index.ts`; route registration itself stays in `app/router`.

## Feature catalog

- `session`: role picker and current demo user.
- `donations`: publish, list, detail, and timeline.
- `vision`: camera capture, AI suggestion, and manual fallback.
- `offers`: NGO inbox, countdown, accept/reject, and score breakdown.
- `pickups`: driver tasks, route, and QR collection/delivery.
- `coupons`: driver wallet and QR voucher.
- `partner`: coupon CRUD, redemption feed, and simulated ROI.
- `impact`: seller dashboard KPIs, live table, and map.
- `offline`: IndexedDB queue, idempotency keys, and reconnect synchronization.
- `admin`: queue depths, DLQ, and correlation-id event log.

## Lint enforcement

Architecture violations must fail lint, not rely on review memory. Configure `eslint-plugin-boundaries` or `import/no-restricted-paths` so that:

- `shared` cannot import from `features` or `app`.
- features cannot import from `app`.
- a feature cannot deep-import another feature.
- approved cross-feature imports resolve only to `features/<target>/index.ts`.
- `app` cannot deep-import feature internals.

Use path aliases and resolver settings consistently so the rules cover alias, relative, and absolute import forms. Do not add an escape hatch for a single implementation; adjust ownership or the public API instead. Run the same boundary lint in local checks, pre-commit, and CI.

When adding a feature, create only the subdirectories it needs, add contract changes to `packages/shared`, expose a deliberate `index.ts`, register its routes centrally, and verify loading, empty, error, and offline states.
