#!/usr/bin/env bash
# Deploys Resgata to Azure Container Apps in an existing resource group.
#
#   infra/azure/deploy.sh                # infrastructure + images + apps
#   SKIP_INFRA=1 infra/azure/deploy.sh   # rebuild images and update apps only
#   SKIP_INFRA=1 RESET_DB=1 infra/azure/deploy.sh  # also reload schema + demo data
#
# Requires `az login`. Generated names and the database password are kept in
# .env.azure (git-ignored); ANTHROPIC_API_KEY is read from .env.
set -euo pipefail
export PYTHONWARNINGS=ignore

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

RESOURCE_GROUP="${RESOURCE_GROUP:-SAO-PAULO-team-3}"
LOCATION="${LOCATION:-brazilsouth}"
STATE_FILE="$ROOT/.env.azure"

log() { printf '\n==> %s\n' "$*"; }
env_value() { grep -E "^$1=" "$2" 2>/dev/null | tail -1 | cut -d= -f2-; }

# Stable, globally unique names persisted between runs.
if [[ ! -f "$STATE_FILE" ]]; then
  suffix="$(openssl rand -hex 3)"
  cat >"$STATE_FILE" <<EOF
AZ_SUFFIX=$suffix
AZ_ACR=resgatacr$suffix
AZ_STORAGE=resgatast$suffix
AZ_PG_SERVER=resgata-pg-$suffix
AZ_PG_USER=resgata
AZ_PG_PASSWORD=Rg$(openssl rand -hex 12)9
AZ_ENV=resgata-env
EOF
  chmod 600 "$STATE_FILE"
fi
# shellcheck disable=SC1090
source "$STATE_FILE"

ANTHROPIC_API_KEY="$(env_value ANTHROPIC_API_KEY "$ROOT/.env")"
ANTHROPIC_MODEL="$(env_value ANTHROPIC_MODEL "$ROOT/.env")"
ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-sonnet-5-5}"
AZURE_MAPS_KEY="$(env_value AZURE_MAPS_KEY "$ROOT/.env")"
TAG="$(git rev-parse --short HEAD)$(git diff --quiet || echo -dirty)"

az extension add --name containerapp --upgrade --only-show-errors >/dev/null

if [[ -z "${SKIP_INFRA:-}" ]]; then
  log "Container registry $AZ_ACR"
  az acr show -n "$AZ_ACR" -g "$RESOURCE_GROUP" >/dev/null 2>&1 ||
    az acr create -n "$AZ_ACR" -g "$RESOURCE_GROUP" -l "$LOCATION" --sku Basic \
      --admin-enabled true --only-show-errors >/dev/null

  log "Storage account $AZ_STORAGE (photos and Functions host state)"
  az storage account show -n "$AZ_STORAGE" -g "$RESOURCE_GROUP" >/dev/null 2>&1 ||
    az storage account create -n "$AZ_STORAGE" -g "$RESOURCE_GROUP" -l "$LOCATION" \
      --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 \
      --allow-blob-public-access false --only-show-errors >/dev/null

  log "PostgreSQL flexible server $AZ_PG_SERVER (B1ms, PostGIS)"
  if ! az postgres flexible-server show -n "$AZ_PG_SERVER" -g "$RESOURCE_GROUP" >/dev/null 2>&1; then
    az postgres flexible-server create -n "$AZ_PG_SERVER" -g "$RESOURCE_GROUP" \
      -l "$LOCATION" --tier Burstable --sku-name Standard_B1ms --storage-size 32 \
      --version 16 --admin-user "$AZ_PG_USER" --admin-password "$AZ_PG_PASSWORD" \
      --public-access 0.0.0.0 --yes \
      --only-show-errors >/dev/null
  fi
  az postgres flexible-server parameter set -g "$RESOURCE_GROUP" -s "$AZ_PG_SERVER" \
    --name azure.extensions --value POSTGIS,PGCRYPTO --only-show-errors >/dev/null
  az postgres flexible-server db show -g "$RESOURCE_GROUP" -s "$AZ_PG_SERVER" -n resgata >/dev/null 2>&1 ||
    az postgres flexible-server db create -g "$RESOURCE_GROUP" -s "$AZ_PG_SERVER" \
      -n resgata --only-show-errors >/dev/null

  log "Container Apps environment $AZ_ENV"
  az containerapp env show -n "$AZ_ENV" -g "$RESOURCE_GROUP" >/dev/null 2>&1 ||
    az containerapp env create -n "$AZ_ENV" -g "$RESOURCE_GROUP" -l "$LOCATION" \
      --logs-destination none --only-show-errors >/dev/null
fi

ACR_SERVER="$(az acr show -n "$AZ_ACR" --query loginServer -o tsv)"
ACR_PASSWORD="$(az acr credential show -n "$AZ_ACR" --query 'passwords[0].value' -o tsv)"
STORAGE_CONNECTION="$(az storage account show-connection-string -n "$AZ_STORAGE" -g "$RESOURCE_GROUP" --query connectionString -o tsv)"
PG_HOST="$(az postgres flexible-server show -n "$AZ_PG_SERVER" -g "$RESOURCE_GROUP" --query fullyQualifiedDomainName -o tsv)"
DATABASE_URL="postgresql://$AZ_PG_USER:$AZ_PG_PASSWORD@$PG_HOST:5432/resgata?sslmode=require"

if [[ -n "${RESET_DB:-}" ]]; then
  # Demo data only: drop and recreate the database so every migration and
  # seed runs again (needed after schema changes such as new migrations).
  log "Recreating database resgata (RESET_DB=1)"
  az postgres flexible-server db delete -g "$RESOURCE_GROUP" -s "$AZ_PG_SERVER" -n resgata \
    --yes --only-show-errors >/dev/null 2>&1 || true
  az postgres flexible-server db create -g "$RESOURCE_GROUP" -s "$AZ_PG_SERVER" -n resgata \
    --only-show-errors >/dev/null
fi

if [[ -z "${SKIP_INFRA:-}" || -n "${RESET_DB:-}" ]]; then
  log "Database schema and demo data"
  MY_IP="$(curl -fsS https://api.ipify.org)"
  az postgres flexible-server firewall-rule create -g "$RESOURCE_GROUP" -s "$AZ_PG_SERVER" \
    -n deployer --start-ip-address "$MY_IP" --end-ip-address "$MY_IP" \
    --only-show-errors >/dev/null
  run_psql() {
    docker run --rm -i -e PGPASSWORD="$AZ_PG_PASSWORD" postgres:16-alpine \
      psql "host=$PG_HOST port=5432 user=$AZ_PG_USER dbname=resgata sslmode=require" \
      -v ON_ERROR_STOP=1 -q "$@"
  }
  if [[ "$(run_psql -At -c "SELECT to_regclass('public.users') IS NOT NULL")" != "t" ]]; then
    # Same order as the docker-entrypoint-initdb.d mounts in docker-compose.yml.
    for file in \
      db/migrations/001_initial_schema.sql \
      db/migrations/002_messaging_and_atomic_operations.sql \
      db/migrations/003_metrics_receipts_ratings.sql \
      db/migrations/003b_donation_items.sql \
      db/seed/001_demo_seed.sql \
      db/seed/002_metrics_seed.sql \
      db/migrations/004_needs_photos_login.sql \
      db/migrations/005_present_as_real.sql \
      db/migrations/006_sao_paulo_trip_demo.sql; do
      echo "  $file"
      run_psql <"$file" >/dev/null
    done
  else
    echo "  schema already present; skipping"
  fi
fi

log "Building images in Azure (tag $TAG)"
build() {
  az acr build -r "$AZ_ACR" -t "$1:$TAG" -f "$2" --platform linux/amd64 \
    --no-logs --only-show-errors . >/dev/null
  echo "  built $1:$TAG"
}
build resgata-api infra/docker/api.Dockerfile &
build resgata-workers infra/docker/workers.Dockerfile &
build resgata-web infra/docker/web.Dockerfile &
build resgata-mocks services/mocks/Dockerfile &
build resgata-gateway infra/azure/gateway.Dockerfile &
wait

COMMON_ENV=(
  "NODE_ENV=production"
  "DATABASE_URL=secretref:database-url"
  "AzureWebJobsStorage=secretref:storage-connection"
  "ANTHROPIC_API_KEY=secretref:anthropic-api-key"
  "AZURE_MAPS_KEY=secretref:azure-maps-key"
  "ANTHROPIC_MODEL=$ANTHROPIC_MODEL"
  "MATCHING_MODEL=$ANTHROPIC_MODEL"
  "QUEUE_DRIVER=pg"
  "SCHEDULER_DRIVER=pg"
  "OFFER_TIMEOUT_SECONDS=3600"
  "ENABLE_DEV_RESET=true"
  "ENABLE_DEMO_LOGIN=true"
  "ENABLE_DEV_LOGIN_CODES=true"
  "GEO_PROVIDER=auto"
  "ROUTING_PROVIDER=osrm"
  "OSRM_URL=https://router.project-osrm.org"
  "NOTIFICATION_PROVIDER=acs-mock"
  "ACS_BASE_URL=http://mock-acs"
  "ACS_MOCK_URL=http://mock-acs/messages"
  "FUNCTIONS_WORKER_RUNTIME=node"
  "AzureWebJobsFeatureFlags=EnableWorkerIndexing"
)
SECRETS=(
  "database-url=$DATABASE_URL"
  "storage-connection=$STORAGE_CONNECTION"
  "anthropic-api-key=${ANTHROPIC_API_KEY:-unset}"
  "azure-maps-key=${AZURE_MAPS_KEY:-unset}"
  "acr-password=$ACR_PASSWORD"
)

# create-or-update NAME IMAGE [extra create args...]; APP_ENV adds app-only vars.
APP_ENV=()
deploy_app() {
  local name="$1" image="$2"
  local env_vars=("${COMMON_ENV[@]}" "${APP_ENV[@]+"${APP_ENV[@]}"}")
  shift 2
  if az containerapp show -n "$name" -g "$RESOURCE_GROUP" >/dev/null 2>&1; then
    az containerapp secret set -n "$name" -g "$RESOURCE_GROUP" --secrets "${SECRETS[@]}" \
      --only-show-errors >/dev/null
    az containerapp update -n "$name" -g "$RESOURCE_GROUP" --image "$ACR_SERVER/$image:$TAG" \
      --set-env-vars "${env_vars[@]}" --only-show-errors >/dev/null
  else
    az containerapp create -n "$name" -g "$RESOURCE_GROUP" --environment "$AZ_ENV" \
      --image "$ACR_SERVER/$image:$TAG" --registry-server "$ACR_SERVER" \
      --registry-username "$AZ_ACR" --registry-password "$ACR_PASSWORD" \
      --secrets "${SECRETS[@]}" --env-vars "${env_vars[@]}" "$@" \
      --only-show-errors >/dev/null
  fi
  echo "  $name -> $image:$TAG"
}

log "Deploying container apps"
APP_ENV=("MOCK_KIND=acs" "PORT=3000")
deploy_app mock-acs resgata-mocks --ingress internal --target-port 3000 \
  --transport http --allow-insecure --min-replicas 0 --max-replicas 1 --cpu 0.25 --memory 0.5Gi
APP_ENV=()
deploy_app api resgata-api --ingress internal --target-port 80 --transport http \
  --allow-insecure --min-replicas 1 --max-replicas 2 --cpu 0.5 --memory 1Gi
deploy_app workers resgata-workers --min-replicas 1 --max-replicas 1 --cpu 0.5 --memory 1Gi
deploy_app web resgata-web --ingress internal --target-port 8080 --transport http \
  --allow-insecure --min-replicas 1 --max-replicas 1 --cpu 0.25 --memory 0.5Gi
deploy_app gateway resgata-gateway --ingress external --target-port 8080 \
  --min-replicas 1 --max-replicas 2 --cpu 0.25 --memory 0.5Gi

URL="https://$(az containerapp show -n gateway -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)"
log "Deployed: $URL"
