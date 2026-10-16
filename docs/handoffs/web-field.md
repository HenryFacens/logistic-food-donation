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
