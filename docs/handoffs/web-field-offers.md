# Web Field — ONG offers

## Completed work

- Isolated the match secondary text under `.offer-card__match-copy` so generic
  `span` styles no longer override the check container.
- Fixed `.offer-card__check` at 44 × 44 px with a centered 18 × 18 px block SVG,
  zero padding, fixed flex sizing, and explicit self-alignment.
- Removed repeated `SIMULADO` badges from individual offer cards and the
  acceptance sheet.
- Added one contextual simulation notice to the page header when at least one
  loaded offer contains simulated donation data.
- Added static rendering coverage for the single contextual simulation notice
  and for the real-data case without a notice.

## Verification

Commands run from `apps/web`:

```bash
./node_modules/.bin/vitest run src/features/offers
./node_modules/.bin/oxlint -c .oxlintrc.json src/features/offers
./node_modules/.bin/tsc -b --pretty false
node scripts/check-boundaries.mjs
```

Results:

- 2 test files passed; 5 tests passed.
- Focused oxlint passed.
- TypeScript project build passed.
- Boundary check passed for 169 source files.
- `git diff --check` passed for the owned paths.

The updated CSS was also rendered at a 390 × 844 viewport through a temporary
Vite server. Browser measurements:

- check container: 44 × 44 px;
- SVG: 18 × 18 px with `display: block`;
- horizontal and vertical center delta: 0 px;
- contextual `SIMULADO` markers: exactly 1.

The temporary visual-check page and Vite server were removed/stopped after the
measurement.

## Remaining integration step

`http://localhost:8080` was still serving the previous Web image and the old
asset `index-BpC44ZUg.css` during verification. The orchestrator must rebuild
and restart the Web/Gateway integration before validating the corrected bundle
on port 8080.

## Assumptions and gaps

- The simulation notice is list-level because the page currently shows one
  homogeneous offer feed. It appears only when at least one offer has
  `donation.simulated === true`.
- Offers whose donation relation is absent cannot be identified as simulated
  by the current frozen contract, so they do not trigger the notice.
- No API, route, shared component, or shared contract changes were required.

## Contract changes

- None requested.

## Operational facts

- Existing gateway: `http://localhost:8080`.
- Existing API container exposure observed at port `7071`.
- No environment variables or seed identifiers were changed.
