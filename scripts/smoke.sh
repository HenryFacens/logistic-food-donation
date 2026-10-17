#!/usr/bin/env bash
set -Eeuo pipefail

API_BASE="${API_BASE:-http://localhost:8080/api}"
ACS_BASE="${ACS_BASE:-http://localhost:4003}"
POSTGRES_USER="${POSTGRES_USER:-resgata}"
POSTGRES_DB="${POSTGRES_DB:-resgata}"
SMOKE_TMP="$(mktemp -d /tmp/resgata-smoke.XXXXXX)"
RUN_ID="$(date +%s)-$$"

cleanup() {
  case "${SMOKE_TMP:-}" in
    /tmp/resgata-smoke.*) rm -rf -- "$SMOKE_TMP" ;;
  esac
}
trap cleanup EXIT

fail() {
  printf 'SMOKE FAILED: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

assert_equal() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  [ "$actual" = "$expected" ] ||
    fail "$label: expected '$expected', got '$actual'"
}

psql_scalar() {
  docker compose exec -T postgres psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -Atc "$1"
}

wait_for_health() {
  local attempt
  for attempt in $(seq 1 60); do
    if curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
  fail "API did not become healthy"
}

reset_demo() {
  curl -fsS -X DELETE "$ACS_BASE/outbox" >/dev/null
  curl -fsS -X POST "$API_BASE/dev/reset" \
    -H 'X-Demo-User: platform-resgata' \
    -H "Idempotency-Key: reset-$RUN_ID-$1" >/dev/null
}

donation_payload() {
  local description="$1"
  local available_from expires_at
  available_from="$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%SZ)"
  expires_at="$(date -u -d '+6 hours' +%Y-%m-%dT%H:%M:%SZ)"
  jq -nc \
    --arg description "$description" \
    --arg availableFrom "$available_from" \
    --arg expiresAt "$expires_at" \
    '{
      category: "bakery",
      description: $description,
      quantity: 10,
      unit: "kg",
      estimatedWeightKg: 10,
      perishabilityMinutes: 720,
      pickupAddress: {
        line1: "Rua Coronel Quirino, 780",
        district: "Cambuí",
        city: "Campinas",
        state: "SP",
        postalCode: "13025-001",
        location: {latitude: -22.8972, longitude: -47.0531}
      },
      availableFrom: $availableFrom,
      expiresAt: $expiresAt
    }'
}

create_donation() {
  local key="$1"
  local payload="$2"
  curl -fsS -X POST "$API_BASE/donations" \
    -H 'Content-Type: application/json' \
    -H 'X-Demo-User: seller-padaria-cambui' \
    -H "Idempotency-Key: $key" \
    --data "$payload"
}

wait_for_offer() {
  local donation_id="$1"
  local attempt row
  for attempt in $(seq 1 30); do
    row="$(psql_scalar "
      SELECT offer.id || '|' || app_user.demo_key
      FROM offers AS offer
      JOIN ngos AS ngo ON ngo.id = offer.ngo_id
      JOIN users AS app_user ON app_user.id = ngo.user_id
      WHERE offer.donation_id = '$donation_id'
        AND offer.status = 'pending'
      ORDER BY offer.created_at DESC
      LIMIT 1;
    ")"
    if [ -n "$row" ]; then
      printf '%s\n' "$row"
      return
    fi
    sleep 1
  done
  fail "pending offer not created for donation $donation_id"
}

wait_for_pickup() {
  local donation_id="$1"
  local ngo_key="$2"
  local attempt response pickup
  for attempt in $(seq 1 20); do
    response="$(curl -fsS "$API_BASE/pickups?limit=100" \
      -H "X-Demo-User: $ngo_key")"
    pickup="$(jq -c --arg donationId "$donation_id" \
      '.items[] | select(.donationId == $donationId)' <<<"$response")"
    if [ -n "$pickup" ]; then
      printf '%s\n' "$pickup"
      return
    fi
    sleep 1
  done
  fail "pickup not created for donation $donation_id"
}

happy_path_and_idempotency() {
  reset_demo happy
  local key="donation-$RUN_ID-happy"
  local payload first replay donation_id offer_row offer_id ngo_key
  local pickup pickup_id pickup_code delivery_code receipt rating final outbox

  payload="$(donation_payload 'Pães do smoke test')"
  first="$(create_donation "$key" "$payload")"
  replay="$(create_donation "$key" "$payload")"
  donation_id="$(jq -r '.id' <<<"$first")"

  assert_equal "$donation_id" "$(jq -r '.id' <<<"$replay")" \
    "idempotent replay resource"
  assert_equal "1" "$(psql_scalar "
    SELECT count(*) FROM donations WHERE idempotency_key = '$key';
  ")" "idempotent donation count"

  offer_row="$(wait_for_offer "$donation_id")"
  offer_id="${offer_row%%|*}"
  ngo_key="${offer_row#*|}"
  curl -fsS -X POST "$API_BASE/offers/$offer_id/accept" \
    -H 'Content-Type: application/json' \
    -H "X-Demo-User: $ngo_key" \
    -H "Idempotency-Key: accept-$RUN_ID-happy" \
    --data '{}' >/dev/null

  pickup="$(wait_for_pickup "$donation_id" "$ngo_key")"
  pickup_id="$(jq -r '.id' <<<"$pickup")"
  pickup_code="$(jq -r '.pickupCode' <<<"$pickup")"
  delivery_code="$(jq -r '.deliveryCode' <<<"$pickup")"

  curl -fsS -X POST "$API_BASE/pickups/$pickup_id/assign" \
    -H 'Content-Type: application/json' \
    -H "X-Demo-User: $ngo_key" \
    -H "Idempotency-Key: assign-$RUN_ID-happy" \
    --data '{"driverId":"23000000-0000-4000-8000-000000000001"}' >/dev/null
  curl -fsS -X POST "$API_BASE/pickups/$pickup_id/collect" \
    -H 'Content-Type: application/json' \
    -H 'X-Demo-User: driver-ana' \
    -H "Idempotency-Key: collect-$RUN_ID-happy" \
    --data "{\"code\":\"$pickup_code\",\"location\":{\"latitude\":-22.8972,\"longitude\":-47.0531}}" >/dev/null
  curl -fsS -X POST "$API_BASE/pickups/$pickup_id/deliver" \
    -H 'Content-Type: application/json' \
    -H 'X-Demo-User: driver-ana' \
    -H "Idempotency-Key: deliver-$RUN_ID-happy" \
    --data "{\"code\":\"$delivery_code\",\"location\":{\"latitude\":-22.9008,\"longitude\":-47.0606}}" >/dev/null
  receipt="$(curl -fsS -X POST "$API_BASE/pickups/$pickup_id/receipt" \
    -H 'Content-Type: application/json' \
    -H "X-Demo-User: $ngo_key" \
    -H "Idempotency-Key: receipt-$RUN_ID-happy" \
    --data '{"condition":"all_good","receivedWeightKg":10,"rejectedWeightKg":0,"rejectionReasons":[]}')"
  assert_equal "$pickup_id" "$(jq -r '.pickupId' <<<"$receipt")" \
    "NGO receipt pickup"
  rating="$(curl -fsS -X POST "$API_BASE/pickups/$pickup_id/driver-rating" \
    -H 'Content-Type: application/json' \
    -H 'X-Demo-User: seller-padaria-cambui' \
    -H "Idempotency-Key: rating-$RUN_ID-happy" \
    --data '{"rating":5,"tags":["pontualidade","cuidado com a carga"],"comment":"Fluxo smoke 0.2."}')"
  assert_equal "5" "$(jq -r '.rating' <<<"$rating")" \
    "seller driver rating"

  final="$(curl -fsS "$API_BASE/donations/$donation_id" \
    -H 'X-Demo-User: seller-padaria-cambui')"
  assert_equal "delivered" "$(jq -r '.status' <<<"$final")" \
    "happy path final status"

  for _attempt in $(seq 1 20); do
    outbox="$(curl -fsS "$ACS_BASE/outbox")"
    [ "$(jq -r '.count' <<<"$outbox")" -ge 7 ] && break
    sleep 1
  done
  assert_equal "1" "$(jq '[.items[] | select(.body | startswith("Nova oferta"))] | length' <<<"$outbox")" \
    "offer notification count"
  assert_equal "3" "$(jq '[.items[] | select(.body | startswith("Coleta confirmada"))] | length' <<<"$outbox")" \
    "collection notification count"
  assert_equal "3" "$(jq '[.items[] | select(.body | startswith("Entrega confirmada"))] | length' <<<"$outbox")" \
    "delivery notification count"
  printf 'PASS happy path and idempotent replay (%s)\n' "$donation_id"
}

timeout_fallback() {
  reset_demo fallback
  local payload donation donation_id first_offer first_offer_id state attempt

  payload="$(donation_payload 'Pães do fallback smoke test')"
  donation="$(create_donation "donation-$RUN_ID-fallback" "$payload")"
  donation_id="$(jq -r '.id' <<<"$donation")"
  first_offer="$(wait_for_offer "$donation_id")"
  first_offer_id="${first_offer%%|*}"

  for attempt in $(seq 1 50); do
    state="$(psql_scalar "
      SELECT
        count(*) FILTER (WHERE status = 'timed_out') || '|' ||
        count(*) FILTER (WHERE status = 'pending')
      FROM offers
      WHERE donation_id = '$donation_id';
    ")"
    if [ "$state" = "1|1" ]; then
      break
    fi
    sleep 1
  done
  assert_equal "1|1" "$state" "sequential NGO fallback"
  assert_equal "timed_out" "$(psql_scalar "
    SELECT status FROM offers WHERE id = '$first_offer_id';
  ")" "first offer timeout"
  printf 'PASS timeout fallback to next NGO (%s)\n' "$donation_id"
}

concurrent_acceptance() {
  reset_demo concurrent
  local payload donation donation_id offer_row offer_id ngo_key
  local code_a code_b statuses

  payload="$(donation_payload 'Pães do concurrent smoke test')"
  donation="$(create_donation "donation-$RUN_ID-concurrent" "$payload")"
  donation_id="$(jq -r '.id' <<<"$donation")"
  offer_row="$(wait_for_offer "$donation_id")"
  offer_id="${offer_row%%|*}"
  ngo_key="${offer_row#*|}"

  curl -sS -o "$SMOKE_TMP/accept-a.json" -w '%{http_code}' \
    -X POST "$API_BASE/offers/$offer_id/accept" \
    -H 'Content-Type: application/json' \
    -H "X-Demo-User: $ngo_key" \
    -H "Idempotency-Key: accept-$RUN_ID-a" \
    --data '{}' >"$SMOKE_TMP/accept-a.code" &
  local pid_a=$!
  curl -sS -o "$SMOKE_TMP/accept-b.json" -w '%{http_code}' \
    -X POST "$API_BASE/offers/$offer_id/accept" \
    -H 'Content-Type: application/json' \
    -H "X-Demo-User: $ngo_key" \
    -H "Idempotency-Key: accept-$RUN_ID-b" \
    --data '{}' >"$SMOKE_TMP/accept-b.code" &
  local pid_b=$!
  wait "$pid_a" "$pid_b"

  code_a="$(<"$SMOKE_TMP/accept-a.code")"
  code_b="$(<"$SMOKE_TMP/accept-b.code")"
  statuses="$(printf '%s\n%s\n' "$code_a" "$code_b" | sort | paste -sd' ' -)"
  assert_equal "200 409" "$statuses" "concurrent acceptance HTTP statuses"
  assert_equal "1" "$(psql_scalar "
    SELECT count(*) FROM offers
    WHERE donation_id = '$donation_id' AND status = 'accepted';
  ")" "accepted offer count"
  assert_equal "1" "$(psql_scalar "
    SELECT count(*) FROM pickups WHERE donation_id = '$donation_id';
  ")" "pickup count after concurrent acceptance"
  printf 'PASS concurrent acceptance has one winner (%s)\n' "$donation_id"
}

require_command curl
require_command docker
require_command jq
require_command date
wait_for_health
happy_path_and_idempotency
timeout_fallback
concurrent_acceptance
reset_demo final
printf 'SMOKE PASSED\n'
