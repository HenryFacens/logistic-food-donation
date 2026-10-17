# Web Field Dashboards handoff

## Completed work

- Refactored `MetricsDashboard` into audience-specific visual compositions.
- Driver dashboard now presents:
  - missions available, accepted, and completed as a funnel;
  - completion versus cancellation as a donut;
  - acceptance, collection, and delivery times as a curve;
  - transported versus NGO-confirmed weight as bars;
  - punctuality, ratings, and geolocation confirmation as visual indicators;
  - reduced metric-card groups for route evidence, unconfigured reputation
    formulas, and rewards.
- NGO dashboard now presents:
  - receipt condition as a donut;
  - receipt confirmation as a donut;
  - used versus idle capacity as a donut;
  - received versus community-distributed weight as a funnel;
  - reduced cards for network/logistics and explicit community-data gaps.
- Kept unavailable values out of charts instead of substituting fictional data.
- Converted driver acceptance time from seconds to minutes only in the chart
  view model and made the conversion explicit in the UI.
- Moved the evidence legend into a collapsed disclosure so it remains available
  without dominating the dashboard.
- Kept exactly one `SIMULADO` badge in the dashboard header when the API marks
  the response as simulated.
- Added responsive layouts for wide desktop shells and single-column mobile
  screens.
- Added focused view-model and server-render tests.

## Files created or changed

- `apps/web/src/features/pickups/components/MetricsDashboard.tsx`
- `apps/web/src/features/pickups/components/MetricsDashboard.test.tsx`
- `apps/web/src/features/pickups/dashboardViewModels.ts`
- `apps/web/src/features/pickups/dashboardViewModels.test.ts`
- `apps/web/src/features/pickups/messages.ts`
- `apps/web/src/features/pickups/pickups.css`

## Verification

Commands run from `apps/web`:

```text
./node_modules/.bin/tsc -b --pretty false
./node_modules/.bin/vitest run --passWithNoTests
./node_modules/.bin/oxlint -c .oxlintrc.json src
node scripts/check-boundaries.mjs
./node_modules/.bin/vite build
```

Results:

- TypeScript project build passed.
- 22 test files passed, 89 tests passed.
- Oxlint passed.
- Boundary check passed for 169 source files.
- Production build passed.
- Vite retained the pre-existing warning that the main minified chunk is above
  500 kB.

The equivalent `pnpm --filter @resgata/web ...` commands could not start because
the bundled pnpm runtime attempted to open its store SQLite database outside the
workspace and returned `ERR_SQLITE_ERROR: unable to open database file`.
Repository-local binaries were used to avoid dependency installation or external
writes.

## Remaining gaps

- Browser visual QA was not executed in this agent handoff. The orchestrator
  should inspect `/motorista/metricas` and `/ong/painel` at desktop and narrow
  mobile widths against the composed local environment.
- The API does not provide historical series for driver or NGO dashboards.
  Therefore, the driver curve compares current-period stage averages rather
  than showing a time series.
- Community distribution, social effectiveness, evidence completeness,
  reliability, levels, and several reward metrics remain unavailable in the
  frozen contract and are shown as unavailable instead of being simulated.

## Assumptions

- `availableMissions` is a current network snapshot, while accepted and
  completed missions are period totals. The UI states this distinction so the
  funnel is not interpreted as a strict historical conversion funnel.
- Receipt conditions are represented by receipt counts because the contract
  exposes counts for all-good, partial, and rejected outcomes.
- Capacity visualization uses the API-provided used and idle percentages; the
  absolute NGO capacity is not exposed by the dashboard contract.

## Contract changes requested

- None. The implementation consumes the frozen `DashboardSection` and
  `DashboardMetric` contracts without changes.

## Operational facts

- Canonical driver metrics route is `/motorista/metricas`; `/motorista/painel`
  remains a compatibility alias owned by Web-core.
- NGO analytics route remains `/ong/painel`.
- No dependency was added.
