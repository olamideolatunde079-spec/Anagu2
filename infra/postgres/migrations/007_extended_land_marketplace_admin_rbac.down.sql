-- ============================================================================
-- Anagu Land Administration Framework — Migration 007 (DOWN / ROLLBACK)
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS administrative_configs CASCADE;
DROP TABLE IF EXISTS settlement_records CASCADE;
DROP TABLE IF EXISTS platform_commissions CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS document_access_grants CASCADE;
DROP TABLE IF EXISTS document_verifications CASCADE;
ALTER TABLE documents DROP COLUMN IF EXISTS document_category;
DROP TABLE IF EXISTS legal_reviews CASCADE;
DROP TABLE IF EXISTS application_status_history CASCADE;
DROP TABLE IF EXISTS account_verifications CASCADE;

COMMIT;
