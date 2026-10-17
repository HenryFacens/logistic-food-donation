#!/usr/bin/env bash
set -euo pipefail

readonly project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly container_name="resgata-contracts-check-$$"

cleanup() {
  docker stop "${container_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

COREPACK_HOME="${COREPACK_HOME:-/tmp/resgata-corepack}" \
  corepack pnpm@10.19.0 --filter @resgata/shared typecheck
COREPACK_HOME="${COREPACK_HOME:-/tmp/resgata-corepack}" \
  corepack pnpm@10.19.0 --filter @resgata/shared test

docker run --rm -d \
  --name "${container_name}" \
  -e POSTGRES_USER=resgata \
  -e POSTGRES_PASSWORD=resgata \
  -e POSTGRES_DB=resgata \
  -v "${project_root}/db:/work/db:ro" \
  postgis/postgis:17-3.5 >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker logs "${container_name}" 2>&1 |
    grep -q "PostgreSQL init process complete"; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "${ready}" != "1" ]]; then
  docker logs "${container_name}"
  echo "PostGIS initialization timed out." >&2
  exit 1
fi

docker exec "${container_name}" psql \
  -U resgata -d resgata -v ON_ERROR_STOP=1 \
  -f /work/db/migrations/001_initial_schema.sql >/dev/null
docker exec "${container_name}" psql \
  -U resgata -d resgata -v ON_ERROR_STOP=1 \
  -f /work/db/migrations/002_messaging_and_atomic_operations.sql >/dev/null
docker exec "${container_name}" psql \
  -U resgata -d resgata -v ON_ERROR_STOP=1 \
  -f /work/db/migrations/003_donation_items.sql >/dev/null
docker exec "${container_name}" psql \
  -U resgata -d resgata -v ON_ERROR_STOP=1 \
  -f /work/db/seed/001_demo_seed.sql >/dev/null
docker exec "${container_name}" psql \
  -U resgata -d resgata -v ON_ERROR_STOP=1 \
  -f /work/db/seed/001_demo_seed.sql >/dev/null

actual_counts="$(
  docker exec "${container_name}" psql -U resgata -d resgata -Atc \
    "SELECT (SELECT count(*) FROM sellers),(SELECT count(*) FROM ngos),(SELECT count(*) FROM drivers),(SELECT count(*) FROM partners),(SELECT count(*) FROM coupons),(SELECT count(*) FROM donations);"
)"
readonly expected_counts="6|5|4|3|8|40"

if [[ "${actual_counts}" != "${expected_counts}" ]]; then
  echo "Unexpected seed counts: ${actual_counts}" >&2
  exit 1
fi

echo "Contracts valid: ${actual_counts}"
