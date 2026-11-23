-- ============================================================================
-- ANAGU — Migration 008: Rollback Parcel Photo Gallery
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS parcel_photos CASCADE;

COMMIT;
