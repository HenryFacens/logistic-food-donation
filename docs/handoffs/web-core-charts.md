# Web Core charts handoff

Date: 2026-10-17

## Completed work

- Added reusable dashboard chart primitives without new dependencies:
  - `DonutChart` for proportional distributions.
  - `LineChart` for responsive SVG curves.
  - `BarFunnelChart` with `bars` and `funnel` variants.
- Added the shared `ChartDatum` contract with `label`, `value`, optional
  `tone`, and optional `color`.
- Added visible textual legends and `aria-label` support. Chart SVGs and bar
  plots are decorative so assistive technology reads the same labels and
  values shown to sighted users.
- Added responsive and forced-colors styles.
- Exported the primitives and types through `shared/ui/dashboard` and
  `shared/ui`.
- Made `/motorista/metricas` the navigable canonical route for
  `driver-dashboard`.
- Kept `/motorista/painel` as a non-navigable compatibility alias using the
  same `RouteId`.

## Verification

The workspace `pnpm` wrapper attempted a dependency status check and failed
before running commands because its global store SQLite database was not
writable:

```text
[ERR_SQLITE_ERROR] unable to open database file
```

No dependency installation was needed. The equivalent package-local binaries
were executed successfully:

```bash
cd apps/web
./node_modules/.bin/vitest run --passWithNoTests src/shared/ui/dashboard/dashboard.test.tsx src/app/router/contract.test.ts
./node_modules/.bin/tsc -b --pretty false
./node_modules/.bin/oxlint -c .oxlintrc.json src/shared/ui/dashboard src/shared/ui/index.ts src/app/router/contract.ts src/app/router/contract.test.ts
node scripts/check-boundaries.mjs
./node_modules/.bin/vitest run --passWithNoTests
./node_modules/.bin/vite build
```

Results:

- Focused tests: 2 files, 11 tests passed.
- Full web tests: 18 files, 77 tests passed.
- Typecheck: passed.
- Focused lint: passed.
- Boundary check: passed for 162 source files.
- Production build: passed.
- `git diff --check` for the owned changes: passed.

The production build retains the pre-existing warning that the main minified
chunk is larger than 500 kB.

## Remaining gaps

- No feature page was changed to consume the new charts; feature owners can now
  compose them from the public `shared/ui` export.
- No browser visual regression pass was run in this scoped task.

## Assumptions

- Chart values are finite numbers supplied by trusted feature view models.
- Donut and bar proportions treat negative values as zero; line charts retain
  negative values.
- The legacy driver URL must render the same page rather than redirect, so both
  route entries intentionally share `driver-dashboard`.

## Contract changes

- None. No shared domain type, API, OpenAPI, migration, or seed change was
  requested.

## Operational facts

- No new dependency, environment variable, port, service, or seed identifier
  was introduced.
