# Offline handoff

## Completed

- Implemented an IndexedDB-backed donation publication queue.
- Persisted request body, correlation ID, and `Idempotency-Key` together.
- Added reconnect replay, retryability filtering, pending-count updates,
  offline banner integration, and a development offline toggle.
- Wired the seller publication flow through the online publisher with queue
  fallback for offline or retryable failures.

## Verification

- Three focused queue tests passed during feature integration.
- The production PWA build generated the service worker and precached app shell.
- Browser startup reported the app as ready for offline use.

## Assumptions

- Business-data reads are not fully mirrored offline; the minimal offline
  guarantee is app-shell availability and durable donation publication.
- Browser background sync is not required; replay occurs on the application
  `online` event.
