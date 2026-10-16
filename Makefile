COMPOSE := docker compose

.PHONY: up full lite down config config-lite seed reset reset-lite logs ps smoke smoke-lite

up: full

full:
	COMPOSE_PROFILES=azure QUEUE_DRIVER=servicebus $(COMPOSE) up --build

lite:
	COMPOSE_PROFILES= QUEUE_DRIVER=pg $(COMPOSE) up --build

down:
	COMPOSE_PROFILES=azure $(COMPOSE) down --remove-orphans

config:
	COMPOSE_PROFILES=azure QUEUE_DRIVER=servicebus $(COMPOSE) config

config-lite:
	COMPOSE_PROFILES= QUEUE_DRIVER=pg $(COMPOSE) config

seed:
	$(COMPOSE) exec -T postgres psql \
		-U "$${POSTGRES_USER:-resgata}" \
		-d "$${POSTGRES_DB:-resgata}" \
		-v ON_ERROR_STOP=1 \
		-f /docker-entrypoint-initdb.d/030-demo-seed.sql

reset:
	COMPOSE_PROFILES=azure $(COMPOSE) down --volumes --remove-orphans
	COMPOSE_PROFILES=azure QUEUE_DRIVER=servicebus $(COMPOSE) up --build

reset-lite:
	COMPOSE_PROFILES=azure $(COMPOSE) down --volumes --remove-orphans
	COMPOSE_PROFILES= QUEUE_DRIVER=pg $(COMPOSE) up --build

logs:
	COMPOSE_PROFILES=azure $(COMPOSE) logs -f --tail=200

ps:
	COMPOSE_PROFILES=azure $(COMPOSE) ps

smoke:
	COMPOSE_PROFILES=azure QUEUE_DRIVER=servicebus OFFER_TIMEOUT_SECONDS=5 \
		$(COMPOSE) up -d --build
	./scripts/smoke.sh

smoke-lite:
	COMPOSE_PROFILES= QUEUE_DRIVER=pg OFFER_TIMEOUT_SECONDS=5 \
		$(COMPOSE) up -d --build
	./scripts/smoke.sh
