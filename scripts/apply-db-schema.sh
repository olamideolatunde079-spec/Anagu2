#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
SQL_DIR="$ROOT_DIR/infra/postgres/init"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

HOST="${POSTGRES_HOST:-localhost}"
PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-anagu}"
DB_USER="${POSTGRES_USER:-anagu}"
DB_PASSWORD="${POSTGRES_PASSWORD:-anagu_secret}"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx 'anagu_postgres'; then
  echo "Applying schema to running local Postgres container..."
  for sql_file in "$SQL_DIR"/01_extensions.sql "$SQL_DIR"/02_schema.sql; do
    if [[ -f "$sql_file" ]]; then
      docker exec -i anagu_postgres psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f - < "$sql_file"
    fi
  done

  if [[ -f "$SQL_DIR/03_seed.sql" ]]; then
    docker exec -i anagu_postgres psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f - < "$SQL_DIR/03_seed.sql"
  fi
  echo "Schema applied to the PostgreSQL container."
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to initialize the database. Install PostgreSQL client tools first."
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

echo "Applying schema to PostgreSQL at ${HOST}:${PORT}/${DB_NAME} ..."
for sql_file in "$SQL_DIR"/01_extensions.sql "$SQL_DIR"/02_schema.sql; do
  if [[ -f "$sql_file" ]]; then
    psql -h "$HOST" -p "$PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$sql_file"
  fi
done

if [[ -f "$SQL_DIR/03_seed.sql" ]]; then
  psql -h "$HOST" -p "$PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SQL_DIR/03_seed.sql"
fi

echo "Schema applied successfully."
