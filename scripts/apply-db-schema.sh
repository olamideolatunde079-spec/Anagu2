#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[db:init] Running versioned PostgreSQL/PostGIS migrations..."
bash "$ROOT_DIR/scripts/db-migrate.sh" up

if [[ "${ANAGU_APPLY_DEV_SEED:-false}" == "true" ]]; then
  bash "$ROOT_DIR/scripts/db-migrate.sh" seed --dev
else
  bash "$ROOT_DIR/scripts/db-migrate.sh" seed
fi

echo "[db:init] Schema and reference seeds applied successfully."
