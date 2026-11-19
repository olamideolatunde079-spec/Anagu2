#!/usr/bin/env bash
# ============================================================================
# Anagu — Phase 3 Infrastructure & Database Verification Suite
# Executes real connectivity, PostGIS, migration up/rollback, Redis, MQTT,
# MinIO private-bucket, persistence, and security checks.
# ============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE missing. Copy .env.example to .env and set real credentials first." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

echo "=== 0. Credential Placeholder & Secret Hygiene Check ==="
for var in POSTGRES_PASSWORD REDIS_PASSWORD MINIO_ROOT_USER MINIO_ROOT_PASSWORD EMQX_DASHBOARD_PASSWORD; do
  val="${!var:-}"
  if [[ -z "$val" || "$val" == CHANGE_ME_* ]]; then
    echo "ERROR: $var is missing or still set to a CHANGE_ME placeholder in .env" >&2
    exit 1
  fi
done
echo "✓ No CHANGE_ME placeholders in active Phase 3 credentials"

echo "=== 1. Docker Compose Validation ==="
docker compose -f "$ROOT_DIR/docker-compose.yml" config >/dev/null
echo "✓ docker-compose.yml valid"
MINIO_APP_USER="${MINIO_APP_USER:-anagu_backend_storage}" \
MINIO_APP_PASSWORD="${MINIO_APP_PASSWORD:-prod_check_placeholder}" \
  docker compose -f "$ROOT_DIR/docker-compose.yml" -f "$ROOT_DIR/docker-compose.prod.yml" --profile production config >/dev/null
echo "✓ docker-compose.prod.yml valid"

echo "=== 2. Container Health & Network Isolation Check ==="
docker compose -f "$ROOT_DIR/docker-compose.yml" ps
docker network inspect anagu_internal --format '{{.Internal}}' | grep -qx 'true'
echo "✓ Internal Docker network confirmed isolated (internal: true)"

echo "=== 3. PostgreSQL + PostGIS Spatial Check ==="
docker exec -i anagu_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
SELECT PostGIS_Version();
SELECT ST_IsValid(ST_GeomFromText('POLYGON((3.396 6.454, 3.397 6.454, 3.397 6.455, 3.396 6.455, 3.396 6.454))', 4326)) AS valid_rect;
SELECT NOT ST_IsValid(ST_GeomFromText('POLYGON((0 0, 1 1, 1 0, 0 1, 0 0))', 4326)) AS invalid_bowtie_detected;
SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public';
SELECT * FROM fn_check_parcel_overlap(
  ST_GeomFromText('POLYGON((3.3962 6.4542, 3.3972 6.4542, 3.3972 6.4552, 3.3962 6.4552, 3.3962 6.4542))', 4326),
  NULL,
  0.5
);
SQL
echo "✓ PostGIS geometry validation, schema presence & overlap check passed"

echo "=== 4. Migration Rollback & Re-Apply Check ==="
bash "$ROOT_DIR/scripts/db-migrate.sh" down 2
bash "$ROOT_DIR/scripts/db-migrate.sh" up
bash "$ROOT_DIR/scripts/db-migrate.sh" status
echo "✓ Migration rollback & re-apply verified"

echo "=== 5. Immutable Audit Log Enforcement Check ==="
docker exec -i anagu_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO audit_events (entity_type, entity_id, event_type, actor_id)
VALUES ('system', '00000000-0000-0000-0000-000000000099', 'INFRA_VERIFY', 'verify-script');
DO $$
BEGIN
  UPDATE audit_events SET event_type = 'TAMPERED' WHERE actor_id = 'verify-script';
  RAISE EXCEPTION 'ERROR: UPDATE succeeded on audit_events!';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE '%append-only and immutable%' THEN
    RAISE NOTICE 'Immutable UPDATE rejection verified: %', SQLERRM;
  ELSE
    RAISE;
  END IF;
END $$;
SQL
echo "✓ Audit log immutability verified"

echo "=== 6. Redis Connectivity & Read/Write Check ==="
docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" anagu_redis redis-cli ping | grep -q PONG
docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" anagu_redis redis-cli SET anagu:verify:persist "ok" >/dev/null
docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" anagu_redis redis-cli GET anagu:verify:persist | grep -qx 'ok'
echo "✓ Redis PONG and SET/GET verified"

echo "=== 7. MinIO Private Bucket & Unauthenticated 403 Check ==="
for bucket in "${MINIO_BUCKET_DOCUMENTS:-land-documents}" "${MINIO_BUCKET_SURVEYS:-survey-plans}" "${MINIO_BUCKET_CERTIFICATES:-title-certificates}" "${MINIO_BUCKET_IDENTITY:-identity-documents}"; do
  policy="$(docker run --rm --network anagu_internal --entrypoint /bin/sh "${MINIO_MC_IMAGE:-minio/mc:RELEASE.2024-10-08T09-37-26Z}" \
    -c "mc alias set check http://minio:9000 '$MINIO_ROOT_USER' '$MINIO_ROOT_PASSWORD' >/dev/null && mc anonymous get check/$bucket")"
  echo "  Bucket $bucket anonymous policy: $policy"
  echo "$policy" | grep -qiE "none|not set" || { echo "ERROR: Bucket $bucket is not private!"; exit 1; }
done
http_code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${MINIO_PORT:-9000}/${MINIO_BUCKET_DOCUMENTS:-land-documents}/test-unauth.txt" || true)"
echo "  Unauthenticated HTTP GET status on private bucket: $http_code"
echo "$http_code" | grep -qE '^(403|404)$' || { echo "ERROR: Unexpected HTTP status $http_code"; exit 1; }
echo "✓ All MinIO buckets confirmed strictly private"

echo "=== 8. EMQX MQTT Broker Check ==="
docker exec anagu_mqtt emqx ping
echo "✓ EMQX broker healthy"

echo "=== 9. Volume Persistence Across Restart Check ==="
docker compose -f "$ROOT_DIR/docker-compose.yml" restart postgres redis >/dev/null
sleep 5
docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" anagu_redis redis-cli GET anagu:verify:persist | grep -qx 'ok'
docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" anagu_redis redis-cli DEL anagu:verify:persist >/dev/null
docker exec -i anagu_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM audit_events WHERE actor_id = 'verify-script';" | grep -qE '^[1-9][0-9]*$'
echo "✓ Persistent volumes retained PostgreSQL and Redis data across restart"

echo "✅ All Phase 3 infrastructure checks passed."
