# Anagu Land Administration Framework — Makefile
.PHONY: help up up-prod down ps logs install build test test-contracts test-backend \
        test-web deploy-amoy verify-amoy dev-backend dev-web \
        component4 fraud latency storage clean reset status db-init \
        db-migrate db-rollback db-status db-seed db-backup infra-verify

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Infrastructure ──────────────────────────────────────────────────────────
up: ## Start all Docker infrastructure services (postgres+postgis, redis, minio, mqtt)
	docker compose up -d
	@echo ""
	@echo "⏳  Waiting 10 s for services to initialise..."
	@sleep 10
	@docker compose ps

up-prod: ## Start infrastructure in hardened production mode (isolated internal network + nginx proxy)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d

down: ## Stop all Docker services
	docker compose down

ps: ## Show service status
	docker compose ps

logs: ## Tail logs from all services
	docker compose logs -f

# ── Dependencies ────────────────────────────────────────────────────────────
install: ## Install all npm dependencies
	npm install --legacy-peer-deps
	@echo "✓ All workspace dependencies installed"

# ── Development servers ─────────────────────────────────────────────────────
dev-backend: ## Start NestJS backend in watch mode (port 3001)
	cd apps/backend && ../../node_modules/.bin/nest start --watch

dev-web: ## Start Next.js web app (port 3000)
	node ./scripts/start-web.cjs

dev-mobile: ## Start Expo mobile app
	cd apps/mobile && npx expo start

# ── Build ───────────────────────────────────────────────────────────────────
build: ## Build backend + web + contracts
	cd apps/backend && ../../node_modules/.bin/nest build
	npm --prefix apps/anugu2 run build
	$(MAKE) compile-contracts
	@echo "✓ All builds complete"

# ── Contracts ───────────────────────────────────────────────────────────────
compile-contracts: ## Compile Solidity contracts
	@echo "Compiling contracts..."
	@cd contracts && HARDHAT_DISABLE_NODE_VERSION_CHECK=true \
	  ../node_modules/.bin/hardhat compile
	@echo "✓ Contracts compiled"

test-contracts: compile-contracts ## Run smart contract tests (in-process Hardhat)
	@echo "Running contract tests..."
	@cd contracts && HARDHAT_DISABLE_NODE_VERSION_CHECK=true \
	  ../node_modules/.bin/hardhat test
	@echo "✓ Contract tests complete"

deploy-amoy: compile-contracts ## Deploy contracts to Polygon Amoy Testnet (Chain ID 80002)
	@echo "Deploying contracts to Polygon Amoy..."
	@cd contracts && HARDHAT_DISABLE_NODE_VERSION_CHECK=true \
	  ../node_modules/.bin/hardhat run scripts/deploy.ts --network polygon_amoy
	@echo "✓ Deployed. Copy the printed addresses into .env"

verify-amoy: ## Verify deployed contracts on Polygonscan Amoy
	@cd contracts && HARDHAT_DISABLE_NODE_VERSION_CHECK=true \
	  ../node_modules/.bin/hardhat run scripts/verify.ts --network polygon_amoy

# ── Backend tests ───────────────────────────────────────────────────────────
test-backend: ## Run NestJS backend unit tests (44 tests, no DB needed)
	@cd apps/backend && ../../node_modules/.bin/jest --runInBand --silent
	@echo "✓ Backend tests complete"

# ── Web type-check ──────────────────────────────────────────────────────────
test-web: ## TypeScript type-check the supplied AI Studio web app
	@npm --prefix apps/anugu2 run lint
	@echo "✓ Anagu UI type-check complete"

# ── All tests ───────────────────────────────────────────────────────────────
test: test-contracts test-backend test-web ## Run ALL tests
	@echo ""
	@echo "✅  All test suites passed"

# ── Component 4 evaluation ──────────────────────────────────────────────────
component4: ## Run Component 4 evaluation (fraud + latency + storage) → Tables 4B/4C/4D
	@echo "Running Component 4 cross-cutting evaluation..."
	@cd apps/backend && ../../node_modules/.bin/jest \
	  --testPathPattern="evaluation" \
	  --runInBand --verbose
	@echo ""
	@echo "✓ Copy the printed tables into PROJECT.md Section 18"

fraud: ## Fraud scenario tests only (Table 4B)
	@cd apps/backend && ../../node_modules/.bin/jest \
	  --testPathPattern="fraud-scenarios" --runInBand --verbose

latency: ## Latency benchmark only (Table 4C)
	@cd apps/backend && ../../node_modules/.bin/jest \
	  --testPathPattern="latency-benchmark" --runInBand --verbose

storage: ## Storage overhead only (Table 4D)
	@cd apps/backend && ../../node_modules/.bin/jest \
	  --testPathPattern="storage-overhead" --runInBand --verbose

# ── Database & Infrastructure ───────────────────────────────────────────────
db-init: ## Apply PostgreSQL/PostGIS migrations and reference seeds
	@bash ./scripts/apply-db-schema.sh

db-migrate: ## Apply pending PostgreSQL/PostGIS migrations
	@bash ./scripts/db-migrate.sh up

db-rollback: ## Rollback last PostgreSQL/PostGIS migration
	@bash ./scripts/db-migrate.sh down 1

db-status: ## Show applied and pending database migrations
	@bash ./scripts/db-migrate.sh status

db-seed: ## Apply reference seed data (pass ANAGU_DEV_SEED=1 for dev fixtures)
	@bash ./scripts/db-migrate.sh seed

db-backup: ## Create checksummed PostgreSQL backup dump
	@bash ./scripts/db-backup.sh

infra-verify: ## Run Phase 3 infrastructure & security verification checks
	@bash ./scripts/verify-infra.sh

status: ## Full project status
	@echo "=== Docker ===" && docker compose ps
	@echo "" && echo "=== Git ===" && git log --oneline -4
	@echo "" && echo "=== Remote ===" && git remote -v

clean: ## Remove build artifacts
	rm -rf apps/backend/dist
	rm -rf apps/web/.next
	rm -rf contracts/artifacts contracts/cache contracts/typechain-types contracts/dist
	@echo "✓ Build artifacts removed"

reset: down clean ## Stop services and remove artifacts
	@echo "✓ Reset complete. Run 'make up && make install' to start fresh."
