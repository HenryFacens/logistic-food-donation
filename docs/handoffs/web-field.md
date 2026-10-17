# Web field operations handoff

## Completed

- Implemented NGO offer cards, countdown/status presentation, score breakdown,
  accept/reject actions, and receiving tasks.
- Implemented driver pickup assignment, collection/delivery confirmation,
  location fallback, QR code display/input, and coupon wallet screens.
- Removed direct feature-to-app imports during integration; field features now
  depend only on shared contracts and injected application services.
- Pickup assignment resolves the current profile from `/me` instead of relying
  on hard-coded seeded identifiers.

## Verification

- Focused tests, TypeScript, lint, architecture-boundary checks, and the
  production PWA build passed during integration.
- The rendered `/ong/ofertas` and `/coleta` routes were exercised against the
  seeded runtime with no browser console errors.

## Assumptions

- GPS denial uses the documented fixed Campinas demo location.
- QR confirmation supports typed demo tokens when camera scanning is
  unavailable.

## Remaining acceptance

- Physical GPS and camera behavior still require an HTTPS phone test.

## 2026-10-16: Verdana Health visual + driver available deliveries

### Completed

- Verdana Health tokens in `apps/web/src/index.css` (navy + sage, 8px radii,
  soft shadows, no gradients), Plus Jakarta Sans / DM Sans / Fira Code from
  Google Fonts, `fontFamily.display|sans|mono` in Tailwind. Light theme is the
  default; dark keeps derived tokens.
- Chips (`StatusBadge`, `SimuladoBadge`), `Button` variants including
  `destructive`, and `MetricValue` (`shared/ui`): numbers in mono
  `tabular-nums`, units in the body face. Applied to impact, partner, admin,
  offers, coupons, and pickups.
- `/coleta` (`features/pickups/pages/DriverDeliveriesPage.tsx`):
  - tabs **Disponíveis** (`awaiting_driver`) and **Minhas entregas**
    (`assigned`, `en_route_pickup`, `collected`, `en_route_delivery`);
    completed deliveries are collapsed at the end;
  - selectable cards: category chip, urgency chip (<2h warning, <1h danger,
    "Vence em 1h20"), weight, description, seller → NGO route, route km,
    distance from the driver, `+N pts`;
  - sticky selection bar ("3 entregas · 42 kg · +225 pts"), disabled with
    "Excede a capacidade do veículo (X kg)" above `GET /me` `capacityKg`;
  - sequential `assign` per pickup through `usePickupActions().acceptMany`,
    reusing the stable per-pickup idempotency keys; 409 → "já foi pega por
    outro motorista", other failures stay selected; switches to
    **Minhas entregas** when everything succeeded or was taken;
  - sorting by urgency (default) or nearest; skeleton, empty, and retry
    states; 15 s polling only on **Disponíveis** (drivers see no SSE event
    for unassigned pickups: `visibility.ts` scopes driver events to their
    own pickups).
- `PickupCard` uses `summary` (names, addresses, kg, points) instead of raw
  coordinates when present; confirmation flow (`PickupConfirmation`) is
  unchanged.
- Pure logic in `features/pickups/viewModels.ts`, tested in
  `viewModels.test.ts`.
- `SseProvider` drops a stored `Last-Event-ID` rejected with
  `invalid_last_event_id` (happened on every open tab after `make reset-lite`).

### Verification

```bash
pnpm --filter @resgata/shared build   # needed once on a fresh checkout
pnpm typecheck && pnpm lint && pnpm test && pnpm build
make reset-lite   # foreground; wait for healthy, then:
make smoke-lite
```

All passed on 2026-10-16 (web 39 tests, shared 12, api 8, workers 9, mocks 3;
smoke: happy path, timeout fallback, concurrent acceptance). Every route was
screenshotted at 390 px and 1280 px with no console errors or horizontal
overflow. The manual demo ran end to end in Chrome: photo → classification →
NGO accept → driver selects 2 and accepts → collect and deliver with codes →
card `+40 pts` = 40 credited → impact 6 → 7 donations, 72 → 77 kg.

### Decisions and assumptions

- White on `#059669` is 3.8:1 (fails AA for normal text), so filled CTAs use
  `--color-primary-strong` `#047857` (5.5:1) with `#065F46` on hover;
  `#059669` remains the accent for borders, bars, and selection. Chips use
  dark tone text (`--color-*-strong`, ≥ 6:1 on their tint).
- Capacity compares only the current selection with `capacityKg`; load
  already in **Minhas entregas** is not subtracted.
- Tailwind `rounded-xl`/`rounded-2xl` map to the 8px radius tokens so legacy
  components follow the new radius without edits.

### Remaining gaps

- Proof codes: see `docs/handoffs/api.md`. No screen shows `pickupCode`.
- Google Fonts need network; offline falls back to system fonts.
- `make smoke-lite` leaves `OFFER_TIMEOUT_SECONDS=5` in the running stack.
  Before a live demo run `COMPOSE_PROFILES= QUEUE_DRIVER=pg docker compose up -d`
  (back to `.env`, 30 s) and `POST /api/dev/reset`.
