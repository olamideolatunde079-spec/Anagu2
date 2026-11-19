#!/usr/bin/env bash
# ============================================================================
# Anagu — PostgreSQL Container Initialization Runner
# Executed automatically on first database volume creation via
# /docker-entrypoint-initdb.d/. Applies all versioned UP migrations and
# production-safe reference seeds from a single source of truth.
# ============================================================================
set -euo pipefail

MIGRATIONS_DIR="/migrations"
SEEDS_DIR="/seeds"

echo "[anagu-db-init] Applying versioned migrations from ${MIGRATIONS_DIR}..."
for up_file in $(ls -1 "${MIGRATIONS_DIR}"/*.up.sql | sort); do
  version="$(basename "${up_file}" .up.sql)"
  echo "[anagu-db-init] -> Applying ${version}"
  psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" -f "${up_file}"
  checksum="$(sha256sum "${up_file}" | awk '{print $1}')"
  psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
    -c "INSERT INTO schema_migrations (version, description, checksum_sha256) VALUES ('${version}', 'Initialized on container bootstrap', '${checksum}') ON CONFLICT (version) DO NOTHING;"
done

echo "[anagu-db-init] Applying reference seeds (roles, permissions, states/LGAs)..."
for seed_file in "${SEEDS_DIR}/001_roles_permissions.sql" "${SEEDS_DIR}/002_nigeria_states_lgas.sql"; do
  if [[ -f "${seed_file}" ]]; then
    echo "[anagu-db-init] -> Seeding $(basename "${seed_file}")"
    psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" -f "${seed_file}"
  fi
done

if [[ "${ANAGU_APPLY_DEV_SEED:-false}" == "true" && -f "${SEEDS_DIR}/003_dev_seed.sql" ]]; then
  echo "[anagu-db-init] -> Seeding dev fixture 003_dev_seed.sql"
  psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" -f "${SEEDS_DIR}/003_dev_seed.sql"
fi

echo "[anagu-db-init] Database initialization complete."
