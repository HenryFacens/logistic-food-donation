# Web Dash charts handoff

## Completed

- Refactored `/metricas` to a visual-first seller dashboard:
  - published, collected, and received donation funnel;
  - completion donut;
  - monthly kg and donation curves;
  - 30, 60, and 90-day loyalty bars;
  - reduced essential operational and fiscal card set;
  - preserved the mandatory fiscal notice and driver rating form.
- Refactored `/plataforma` to a visual-first platform dashboard:
  - published, accepted, collected, and received funnel;
  - matching and confirmed-delivery donuts;
  - active-user and quality-attention bars;
  - reduced essential value card set.
- Kept at most one `SimuladoBadge` in each page header.
- Added key-based local view-model helpers that preserve unavailable values
  instead of converting `null` to zero.
- Added responsive layouts for the mobile seller shell and desktop platform
  shell.

## Files

- `apps/web/src/features/impact/SellerMetricsPage.tsx`
- `apps/web/src/features/impact/messages.ts`
- `apps/web/src/features/impact/seller-metrics.css`
- `apps/web/src/features/impact/seller-dashboard-view-model.ts`
- `apps/web/src/features/impact/seller-dashboard-view-model.test.ts`
- `apps/web/src/features/admin/PlatformDashboardPage.tsx`
- `apps/web/src/features/admin/messages.ts`
- `apps/web/src/features/admin/admin.css`
- `apps/web/src/features/admin/platform-dashboard-view-model.ts`
- `apps/web/src/features/admin/platform-dashboard-view-model.test.ts`

## Verification

- `apps/web/node_modules/.bin/vitest run --passWithNoTests`
  - 20 test files and 85 tests passed.
- `apps/web/node_modules/.bin/tsc -b --pretty false`
- `apps/web/node_modules/.bin/oxlint -c apps/web/.oxlintrc.json apps/web/src`
- `node apps/web/scripts/check-boundaries.mjs`
- `apps/web/node_modules/.bin/vite build`
- `git diff --check -- apps/web/src/features/impact apps/web/src/features/admin`

The normal `pnpm --filter @resgata/web ...` commands could not start because
the bundled pnpm runtime was unable to open its SQLite cache database. Direct
package-local binaries were used without reinstalling dependencies.

## Visual QA

- The updated seller bundle rendered five chart components, one header
  simulation badge, and no browser console errors before the final responsive
  adjustment.
- The first full-page inspection exposed a mobile-shell breakpoint issue;
  seller chart grids were changed to a stable single-column layout.
- The updated error states were inspected after that adjustment.
- Full data-backed final screenshots remain for integration: the running
  `localhost:8080` gateway still serves the previous web bundle, while the
  temporary updated preview cannot reach the gateway API because the browser
  and command runtime use isolated local networks.

## Remaining gaps

- Rebuild the Compose `web` service, then inspect `/metricas` and `/plataforma`
  against the live API as the integration visual gate.
- The existing Vite warning for a JavaScript chunk above 500 kB remains.

## Assumptions and contract changes

- Collected and received platform funnel counts are derived from accepted
  offers multiplied by the existing completion rates and rounded to whole
  offers; the UI states this method.
- No contract, API, route, shared UI, or cross-feature change was requested.
- No contract-change request is open.
