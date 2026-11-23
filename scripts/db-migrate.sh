#!/usr/bin/env bash
# ============================================================================
# Anagu — Reproducible PostgreSQL + PostGIS Migration Runner
# Usage:
#   ./scripts/db-migrate.sh up             # Apply all pending UP migrations
#   ./scripts/db-migrate.sh down [N]       # Rollback last N migrations (default 1)
#   ./scripts/db-migrate.sh status         # List applied and pending migrations
#   ./scripts/db-migrate.sh seed [--dev]   # Apply reference seeds (+ optional dev)
# ============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
MIGRATIONS_DIR="$ROOT_DIR/infra/postgres/migrations"
SEEDS_DIR="$ROOT_DIR/infra/postgres/seeds"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

HOST="${POSTGRES_HOST:-localhost}"
PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-anagu}"
DB_USER="${POSTGRES_USER:-}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

if [[ -z "$DB_USER" || -z "$DB_PASSWORD" || "$DB_PASSWORD" == CHANGE_ME_* ]]; then
  echo "ERROR: POSTGRES_USER and a non-placeholder POSTGRES_PASSWORD must be set in .env or environment." >&2
  exit 1
fi

run_psql_cmd() {
  local sql="$1"
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'anagu_phase3_postgres'; then
    docker exec -i anagu_phase3_postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -tAc "$sql"
  elif command -v psql >/dev/null 2>&1; then
    PGPASSWORD="$DB_PASSWORD" psql -v ON_ERROR_STOP=1 -h "$HOST" -p "$PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "$sql"
  else
    echo "ERROR: Neither running 'anagu_phase3_postgres' Docker container nor local 'psql' client is available." >&2
    exit 1
  fi
}

run_psql_file() {
  local file="$1"
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'anagu_phase3_postgres'; then
    docker exec -i anagu_phase3_postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -f - < "$file"
  elif command -v psql >/dev/null 2>&1; then
    PGPASSWORD="$DB_PASSWORD" psql -v ON_ERROR_STOP=1 -h "$HOST" -p "$PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"
  else
    echo "ERROR: Neither running 'anagu_phase3_postgres' Docker container nor local 'psql' client is available." >&2
    exit 1
  fi
}

ensure_tracking_table() {
  run_psql_cmd "
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      description TEXT NOT NULL,
      checksum_sha256 VARCHAR(64),
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      applied_by TEXT NOT NULL DEFAULT CURRENT_USER
    );
  " >/dev/null
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

cmd_up() {
  ensure_tracking_table
  for up_file in $(ls -1 "$MIGRATIONS_DIR"/*.up.sql | sort); do
    local version
    version="$(basename "$up_file" .up.sql)"
    local applied
    applied="$(run_psql_cmd "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';")"
    if [[ "$applied" -eq 0 ]]; then
      echo "[migrate:up] Applying $version..."
      run_psql_file "$up_file"
      local checksum
      checksum="$(sha256_file "$up_file")"
      run_psql_cmd "INSERT INTO schema_migrations (version, description, checksum_sha256) VALUES ('$version', 'Applied via db-migrate.sh', '$checksum') ON CONFLICT (version) DO NOTHING;" >/dev/null
      echo "[migrate:up] ✓ Applied $version"
    else
      echo "[migrate:up] = Skipping already applied $version"
    fi
  done
}

cmd_down() {
  local steps="${1:-1}"
  ensure_tracking_table
  local applied_versions
  applied_versions="$(run_psql_cmd "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT ${steps};")"
  if [[ -z "$applied_versions" ]]; then
    echo "[migrate:down] No applied migrations to roll back."
    return 0
  fi

  for version in $applied_versions; do
    local down_file="$MIGRATIONS_DIR/${version}.down.sql"
    if [[ ! -f "$down_file" ]]; then
      echo "ERROR: Missing rollback file $down_file" >&2
      exit 1
    fi
    echo "[migrate:down] Rolling back $version..."
    run_psql_file "$down_file"
    if [[ "$version" != "001_extensions_and_enums" ]]; then
      run_psql_cmd "DELETE FROM schema_migrations WHERE version = '$version';" >/dev/null
    else
      run_psql_cmd "DROP TABLE IF EXISTS schema_migrations CASCADE;" >/dev/null || true
    fi
    echo "[migrate:down] ✓ Rolled back $version"
  done
}

cmd_status() {
  ensure_tracking_table
  echo "=== Applied Migrations ==="
  run_psql_cmd "SELECT version || ' | ' || applied_at || ' | ' || COALESCE(checksum_sha256, '') FROM schema_migrations ORDER BY version ASC;"
  echo ""
  echo "=== Pending Migrations ==="
  for up_file in $(ls -1 "$MIGRATIONS_DIR"/*.up.sql | sort); do
    local version
    version="$(basename "$up_file" .up.sql)"
    local applied
    applied="$(run_psql_cmd "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';")"
    if [[ "$applied" -eq 0 ]]; then
      echo "  - $version"
    fi
  done
}

cmd_seed() {
  local include_dev="${1:-}"
  for seed_file in "$SEEDS_DIR/001_roles_permissions.sql" "$SEEDS_DIR/002_nigeria_states_lgas.sql" "$SEEDS_DIR/004_admin_configs.sql"; do
    echo "[seed] Applying $(basename "$seed_file")..."
    run_psql_file "$seed_file"
  done
  if [[ "$include_dev" == "--dev" ]]; then
    echo "[seed] Applying dev fixture 003_dev_seed.sql..."
    run_psql_file "$SEEDS_DIR/003_dev_seed.sql"
  fi
  echo "[seed] ✓ Reference seeds complete."
}

case "${1:-}" in
  up)
    cmd_up
    ;;
  down|rollback)
    cmd_down "${2:-1}"
    ;;
  status)
    cmd_status
    ;;
  seed)
    cmd_seed "${2:-}"
    ;;
  *)
    echo "Usage: $0 {up|down [steps]|status|seed [--dev]}" >&2
    exit 1
    ;;
esac
