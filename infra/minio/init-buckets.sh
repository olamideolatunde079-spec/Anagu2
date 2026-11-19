#!/bin/sh
# ============================================================================
# Anagu — MinIO Private Bucket Initializer
# Creates private land document buckets with anonymous public access
# explicitly DISABLED (mc anonymous set none) and versioning enabled.
# All credentials come from environment variables — zero hardcoded secrets.
# ============================================================================
set -eu

MINIO_ALIAS="anagu_local"
ENDPOINT="${MINIO_INTERNAL_URL:-http://minio:9000}"

: "${MINIO_ROOT_USER:?MINIO_ROOT_USER must be set}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD must be set}"

case "${MINIO_ROOT_USER}" in CHANGE_ME_*) echo "ERROR: MINIO_ROOT_USER still uses CHANGE_ME placeholder." >&2; exit 1 ;; esac
case "${MINIO_ROOT_PASSWORD}" in CHANGE_ME_*) echo "ERROR: MINIO_ROOT_PASSWORD still uses CHANGE_ME placeholder." >&2; exit 1 ;; esac

BUCKET_DOCS="${MINIO_BUCKET_DOCUMENTS:-land-documents}"
BUCKET_SURVEYS="${MINIO_BUCKET_SURVEYS:-survey-plans}"
BUCKET_CERTS="${MINIO_BUCKET_CERTIFICATES:-title-certificates}"
BUCKET_IDENTITY="${MINIO_BUCKET_IDENTITY:-identity-documents}"

echo "[minio-init] Configuring MinIO alias at ${ENDPOINT}..."
mc alias set "${MINIO_ALIAS}" "${ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

for bucket in "${BUCKET_DOCS}" "${BUCKET_SURVEYS}" "${BUCKET_CERTS}" "${BUCKET_IDENTITY}"; do
  echo "[minio-init] Ensuring private bucket: ${bucket}"
  mc mb --ignore-existing "${MINIO_ALIAS}/${bucket}"
  # CRITICAL SECURITY INVARIANT: never allow anonymous/public read or write access
  mc anonymous set none "${MINIO_ALIAS}/${bucket}"
  mc version enable "${MINIO_ALIAS}/${bucket}"
done

# Optional least-privilege backend service account (provisioned only when real credentials are supplied)
case "${MINIO_APP_PASSWORD:-}" in
  ""|CHANGE_ME_*)
    echo "[minio-init] Skipping least-privilege MINIO_APP_USER provisioning (not configured yet — Phase 4/Prod)."
    ;;
  *)
    if [ -n "${MINIO_APP_USER:-}" ]; then
      echo "[minio-init] Provisioning least-privilege backend service policy & user..."
      mc admin policy create "${MINIO_ALIAS}" anagu-backend-rw /policies/anagu-backend-rw.json >/dev/null 2>&1 || \
        mc admin policy update "${MINIO_ALIAS}" anagu-backend-rw /policies/anagu-backend-rw.json >/dev/null 2>&1 || true
      mc admin user add "${MINIO_ALIAS}" "${MINIO_APP_USER}" "${MINIO_APP_PASSWORD}" >/dev/null 2>&1 || true
      mc admin policy attach "${MINIO_ALIAS}" anagu-backend-rw --user "${MINIO_APP_USER}" >/dev/null 2>&1 || true
    fi
    ;;
esac

echo "[minio-init] Verifying bucket privacy policies..."
for bucket in "${BUCKET_DOCS}" "${BUCKET_SURVEYS}" "${BUCKET_CERTS}" "${BUCKET_IDENTITY}"; do
  policy="$(mc anonymous get "${MINIO_ALIAS}/${bucket}" 2>&1 || true)"
  echo "  - ${bucket}: ${policy}"
done

echo "[minio-init] All private MinIO buckets initialized."
