-- ============================================================================
-- Anagu Land Administration Framework — Migration 005 (DOWN / ROLLBACK)
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS marketplace_listings CASCADE;
DROP TABLE IF EXISTS land_transfers CASCADE;
DROP TABLE IF EXISTS title_ownership_history CASCADE;
DROP TABLE IF EXISTS land_titles CASCADE;
DROP TABLE IF EXISTS blockchain_transactions CASCADE;

COMMIT;
