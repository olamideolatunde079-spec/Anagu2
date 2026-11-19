#!/usr/bin/env bash
# ============================================================================
# Anagu — Database Restore Script
# Verifies SHA-256 checksum before restoring a PostgreSQL .dump archive.
# Usage: ./scripts/db-restore.sh backups/anagu_YYYYMMDDTHHMMSSZ.dump
# ============================================================================
set -euo pipefail

DUMP_FILE="${1:?Usage: $0 <path-to-dump-file>}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "ERROR: Dump file not found: $DUMP_FILE" >&2
  exit 1
fi

if [[ -f "${DUMP_FILE}.sha256" ]]; then
  echo "[restore] Verifying SHA-256 checksum..."
  sha256sum -c "${DUMP_FILE}.sha256"
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

: "${POSTGRES_DB:=anagu}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"

echo "[restore] Restoring ${DUMP_FILE} into '${POSTGRES_DB}'..."
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'anagu_postgres'; then
  cat "$DUMP_FILE" | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" anagu_postgres \
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges
elif command -v pg_restore >/dev/null 2>&1; then
  PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
    -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges "$DUMP_FILE"
else
  echo "ERROR: Neither anagu_postgres container nor pg_restore is available." >&2
  exit 1
fi

echo "[restore] ✓ Database restore complete."
