.PHONY: dev up down logs ps restart deploy pull

dev:
\tdocker compose -f docker-compose.dev.yml up

up:
\tdocker compose -f docker-compose.prod.yml up -d --build --remove-orphans

down:
\tdocker compose -f docker-compose.prod.yml down

logs:
\tdocker compose -f docker-compose.prod.yml logs -f --tail=200

ps:
\tdocker compose -f docker-compose.prod.yml ps

restart:
\tdocker compose -f docker-compose.prod.yml restart

pull:
\tdocker compose -f docker-compose.prod.yml pull

deploy: up
