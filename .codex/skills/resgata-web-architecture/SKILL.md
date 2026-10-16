---
name: resgata-web-architecture
description: Implement or review Resgata React web changes while preserving feature boundaries, route and role ownership, public APIs, server-state flow, offline writes, and enforced import rules. Use for work under apps/web; do not use for backend-only changes.
---

# Resgata Web Architecture

Keep `apps/web` as one feature-oriented React/Vite/PWA application with route-selected mobile, desktop, and public shells.

## Work from ownership

1. Identify the feature that owns the behavior before editing.
2. Inspect its `index.ts`, routes, API hooks, and consumers.
3. Keep pages as composition points; put data access in `api/`, feature logic in hooks/model, and rendering in components.
4. Reuse domain types, Zod schemas, state machines, and matching scores from `packages/shared`; never redefine them in the web app.
5. Preserve loading, empty, error, offline, and role-denied behavior affected by the change.

## Non-negotiable boundaries

- Dependencies flow `app -> features -> shared`; `app` may also use `shared`.
- Cross-feature imports are exceptional: import only from the target feature's `index.ts`, never from its internals, and do not introduce cycles.
- If multiple features repeatedly need the same code, move the neutral abstraction to `shared` or reconsider the feature boundary.
- Only `features/*/api` calls the network. Components receive props or invoke their feature's hooks.
- Server state belongs to TanStack Query. Ephemeral UI state stays local.
- Layout selection, role guards, and lazy feature loading belong to `app/router`, not feature pages.
- Simulated data or behavior must render `SimuladoBadge`.

Read [references/feature-boundaries.md](references/feature-boundaries.md) when adding, moving, exporting, or importing feature code, or changing lint rules.

Read [references/routes-data-offline.md](references/routes-data-offline.md) when changing routes, layouts, roles, providers, API state, SSE, mutations, or offline synchronization.

## Completion checks

- New cross-boundary imports use public APIs and remain acyclic.
- Query keys come from the owning feature's factory, not inline strings.
- User-facing copy is in the feature's `messages.ts`.
- Relevant tests are colocated; prioritize hooks/model mappers and critical publish, offer acceptance, and QR confirmation flows.
- Boundary lint passes locally and remains mandatory in CI and pre-commit.
- Interactive controls keep 48px minimum touch targets, action icons include short labels, and status is not conveyed by color alone.
