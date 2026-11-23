-- ============================================================================
-- Anagu Land Administration Framework — Migration 004 (DOWN / ROLLBACK)
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS attestations CASCADE;
DROP TABLE IF EXISTS oracle_verifications CASCADE;

COMMIT;
