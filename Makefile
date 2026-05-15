COMPOSE = docker compose -f docker/docker-compose.yml

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

restart:
	$(COMPOSE) restart

test:
	$(COMPOSE) --profile testing run --rm test

ps:
	$(COMPOSE) ps
