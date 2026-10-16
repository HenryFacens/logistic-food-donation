# Web seller handoff

## Completed

- Implemented the seller donation flow under `features/vision` and
  `features/donations`.
- Added camera/file/manual classification entry points, editable AI
  suggestions, the publication form, seller history, and donation timelines.
- Connected all screens to the shared API client and preserved idempotency keys
  when publication is delegated to the offline queue.
- Added the seller donation section to the desktop impact dashboard.

## Verification

- TypeScript, focused Vitest coverage, architecture boundaries, and the
  production PWA build passed during integration.
- The rendered `/doar` and `/minhas-doacoes` routes were exercised against the
  running gateway with no browser console errors.

## Assumptions

- Camera capture degrades to a file chooser when direct camera access is not
  available.
- Timeline reads remain available through the dedicated events endpoint even
  though donation detail also includes the same ordered timeline.

## Remaining acceptance

- Physical camera behavior still requires an HTTPS phone test.
