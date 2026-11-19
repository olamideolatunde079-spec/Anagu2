# Anagu — Database & Infrastructure Foundation (Phase 3)

## 1. Architecture Overview

ANAGU runs on an isolated, containerised infrastructure foundation built for **PostgreSQL 15 + PostGIS 3**, **MinIO Private Object Storage**, **Redis 7**, and **EMQX 5 MQTT**, connected to **Polygon Amoy Testnet (Chain ID `80002`)** via external EVM RPC.

- **PostgreSQL 15 + PostGIS 3 (`anagu_postgres`)**: Authoritative relational and spatial store (`EPSG:4326` / WGS 84). OpenStreetMap/Leaflet on the frontend remain presentation-only; all parcel geometry checks (`ST_IsValid`, `ST_Intersects`, `ST_Buffer`) execute in PostGIS.
- **MinIO (`anagu_minio`, `anagu_minio_init`)**: S3-compatible private document store. All buckets (`land-documents`, `survey-plans`, `title-certificates`, `identity-documents`) are configured **private by default** (`mc anonymous set none`) with versioning enabled and 25 MB upload limits enforced. Confidential documents and PII are never written on-chain.
- **Redis 7 (`anagu_redis`)**: Password-protected cache and queue store with AOF + RDB persistence.
- **EMQX 5 (`anagu_mqtt`)**: Real-time MQTT broker (`1883`, WebSocket `8083`, TLS `8883`) with topic ACL rules (`infra/emqx/acl.conf`) scoped to `land/#` namespaces.
- **Network Isolation**:
  - `anagu_internal` (`internal: true`): Isolates data-tier services from outbound internet traffic.
  - `anagu_edge`: Used in local development only (`127.0.0.1` bindings). In production (`docker-compose.prod.yml`), direct database, Redis, MinIO console, and EMQX dashboard ports are removed and only the hardened reverse proxy (`nginx`) faces external traffic.

---

## 2. Database Schema & Migrations

Versioned, reversible SQL migrations live in `infra/postgres/migrations/`:

| Version | Domain Coverage |
|---|---|
| `001_extensions_and_enums` | PostGIS, `postgis_topology`, `uuid-ossp`, `pg_trgm`, `fuzzystrmatch`, `pgcrypto`, `schema_migrations`, all enum types |
| `002_auth_rbac_jurisdictions` | `states`, `lgas`, `jurisdictions`, `users`, `auth_sessions`, `roles`, `permissions`, `role_permissions`, `user_roles`, `institutions`, `staff_profiles` |
| `003_parcels_applications_gis` | `parcels` (PostGIS `GEOMETRY(POLYGON, 4326)` + GIST + `ST_IsValid` constraint), `applications`, `gis_verifications`, `fn_validate_parcel_geometry()`, `fn_check_parcel_overlap()` |
| `004_oracle_attestations_documents` | `oracle_verifications`, `attestations`, `documents` (strict `is_private = TRUE`, `visibility = 'PRIVATE'`, SHA-256 hash, max 25 MB check) |
| `005_titles_blockchain_transfers_marketplace` | `blockchain_transactions` (default Polygon Amoy `80002`), `land_titles`, `title_ownership_history`, `land_transfers`, `marketplace_listings` |
| `006_notifications_mqtt_audit_triggers` | `notifications`, `mqtt_events`, `audit_events` (hash-chained SHA-256 `pgcrypto` + `BEFORE UPDATE OR DELETE` immutability trigger) |

Reference seeds live in `infra/postgres/seeds/`:
- `001_roles_permissions.sql` — Statutory RBAC matrix
- `002_nigeria_states_lgas.sql` — 36 Nigerian States + FCT Abuja, representative LGAs, jurisdictions, and state registry ministries
- `003_dev_seed.sql` — Development-only GIS overlap parcel fixture (never loaded in production)

---

## 3. Common Operations

### Initial Setup
```bash
cp .env.example .env
# Populate every password/secret in .env before starting containers
docker compose up -d
docker compose ps
```

### Migrations & Seeds
```bash
bash scripts/db-migrate.sh status
bash scripts/db-migrate.sh up
bash scripts/db-migrate.sh seed          # production-safe reference data
bash scripts/db-migrate.sh seed --dev    # include dev spatial fixture
bash scripts/db-migrate.sh down 1        # rollback last migration
```

### Production Deployment Mode
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
```

### Backup & Disaster Recovery
```bash
# Create checksummed PostgreSQL custom-format dump (.dump + .sha256)
bash scripts/db-backup.sh

# Verify checksum and restore PostgreSQL dump
bash scripts/db-restore.sh backups/anagu_<TIMESTAMP>.dump
```
For MinIO disaster recovery, back up the `minio_data` volume or mirror buckets using `mc mirror` over the private internal network to encrypted off-site S3 storage.

### Automated Infrastructure Verification
```bash
bash scripts/verify-infra.sh
```
