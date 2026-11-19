#!/usr/bin/env bash
# ============================================================================
# Anagu — Database & Object Storage Backup Script
# Creates a timestamped PostgreSQL custom-format dump (.dump + .sha256)
# and optionally mirrors MinIO private buckets.
# ============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

: "${POSTGRES_DB:=anagu}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
if [[ "$POSTGRES_USER" == CHANGE_ME_* || "$POSTGRES_PASSWORD" == CHANGE_ME_* ]]; then
  echo "ERROR: Replace CHANGE_ME placeholders in .env before running backups." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
DUMP_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.dump"

echo "[backup] Dumping PostgreSQL database '${POSTGRES_DB}' to ${DUMP_FILE}..."
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'anagu_postgres'; then
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" anagu_postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges > "$DUMP_FILE"
elif command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges -f "$DUMP_FILE"
else
  echo "ERROR: Neither anagu_postgres container nor pg_dump is available." >&2
  exit 1
fi

sha256sum "$DUMP_FILE" > "${DUMP_FILE}.sha256"
echo "[backup] ✓ PostgreSQL backup saved: ${DUMP_FILE}"
echo "[backup] ✓ SHA-256 checksum saved: ${DUMP_FILE}.sha256"
