-- ============================================================================
-- Anagu Land Administration Framework — Migration 003 (DOWN / ROLLBACK)
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS gis_verifications CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP FUNCTION IF EXISTS fn_check_parcel_overlap(GEOMETRY, UUID, DOUBLE PRECISION) CASCADE;
DROP FUNCTION IF EXISTS fn_validate_parcel_geometry(TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_compute_parcel_metrics() CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;

COMMIT;
