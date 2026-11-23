# Anagu — Land Administration Framework

> An integrated **Blockchain–GIS–NFT–Community Verification Oracle–MQTT** framework
> for land title registration, verification, and lawful revocation.
>
> Statutory basis: Nigeria's Land Use Act (1978), Section 28.

---

## Quick Start

```bash
# 1. Clone and enter the repo
git clone <repo-url> anagu && cd anagu

# 2. Copy environment config
cp .env.example .env
# Edit .env — review local service passwords and backend settings
cp apps/anugu2/.env.example apps/anugu2/.env
# The supplied app uses local API authentication and OpenStreetMap; no browser keys are needed

# 3. Install the monorepo workspaces
npm install
cd apps/anugu2 && npm install && cd ../..

# 4. Start local infrastructure (Postgres, Redis, MQTT, Besu, MinIO)
docker compose up -d

# 5. Confirm services are healthy
docker compose ps

# 6. Apply the Postgres/PostGIS schema to the configured database
npm run db:init
# or: make db-init

# 7. In separate terminals, start the API and supplied AI Studio frontend
npm run backend
npm run web

# 8. Deploy contracts after configuring the local Besu account
npm run deploy:local
```

The supplied Google AI Studio UI lives in `apps/anugu2` and is served at
http://localhost:3000 by `npm run web`. The NestJS API serves on
http://localhost:3001 and Swagger is at http://localhost:3001/api/docs.
`apps/web` is a separate Next.js implementation and is not the default web app.
There is no mobile workspace in this checkout.

The local database schema is loaded by PostgreSQL's init scripts only when its data
volume is first created. The Supabase migration is separate and must be applied to the
intended Supabase project after reviewing its current schema.

The supplied Vite UI registers and signs in through the NestJS API; email confirmation
is not required. Its session is a backend JWT. OpenStreetMap powers public parcel
exploration without a browser API key. Supabase remains optional for other integrations;
never expose `SUPABASE_SECRET_KEY` in browser configuration.

---

## Documentation

The complete build guide, architecture, component specs, API reference, database schema,
test procedures, and results tables are in:

**[spec.md](./spec.md)** is the current acceptance checklist. **[PROJECT.md](./PROJECT.md)**
and **[Anagu_Complete_Build_and_Test_Guide.pdf](./Anagu_Complete_Build_and_Test_Guide.pdf)**
contain the full reference specification.

Use `spec.md` to see which PDF requirements are implemented and verified.

---

## Architecture

```
Supplied Vite / React UI (web)
            ↓
        NestJS Backend
    ┌───────────────────────┐
    │ GIS │ Oracle │ MQTT   │
    │ Blockchain │ Auth     │
    └───────────────────────┘
    ↓           ↓         ↓
PostgreSQL   Hyperledger  EMQX
+PostGIS     Besu (QBFT)  MQTT
    ↓           ↓
  Redis       MinIO
```

---

## Build Order (Do Not Skip Steps)

| Step | Component | Gate |
|------|-----------|------|
| 0 | Environment setup | All services healthy |
| 1 | GIS spatial verification | Test parcels classify correctly |
| 2 | Blockchain / NFT / revocation | 6-case test suite passes |
| 3 | Oracle + MQTT | Verification + MQTT tests pass |
| 4 | Integration | End-to-end workflow passes |
| 5 | Cross-cutting evaluation | All 8 results tables filled |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Vite + React (Google AI Studio supplied UI) |
| Additional web implementation | Next.js 14 (`apps/web`, not the default entrypoint) |
| Backend | NestJS (Node.js / TypeScript) |
| Database | PostgreSQL 15 + PostGIS 3 |
| Blockchain | Hyperledger Besu (PoA-QBFT-DPoS) |
| Smart Contracts | Solidity + Hardhat + OpenZeppelin |
| Messaging | MQTT — EMQX |
| Cache | Redis |
| Object Storage | MinIO |
| Containers | Docker Compose |

---

## Project Structure

```
monorepo/
├── apps/
│   ├── anugu2/       # Supplied Google AI Studio Vite UI
│   ├── web/          # Additional Next.js portal
│   └── backend/      # NestJS API
├── contracts/        # Solidity smart contracts
├── infra/besu/       # Hyperledger Besu config
├── docker-compose.yml
├── .env.example
├── PROJECT.md        # ← Full spec and build guide
└── README.md         # ← This file
```

---

## License

See LICENSE file.
