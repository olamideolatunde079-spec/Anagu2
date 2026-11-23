-- ============================================================================
-- Anagu Land Administration Framework — Migration 001 (DOWN / ROLLBACK)
-- Drops shared trigger function, domain enums, and migration tracking table.
-- Note: Extensions are preserved unless explicitly removed to avoid breaking DB.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS fn_set_updated_at() CASCADE;

DROP TYPE IF EXISTS notification_channel CASCADE;
DROP TYPE IF EXISTS listing_status CASCADE;
DROP TYPE IF EXISTS transfer_status CASCADE;
DROP TYPE IF EXISTS blockchain_tx_status CASCADE;
DROP TYPE IF EXISTS blockchain_tx_type CASCADE;
DROP TYPE IF EXISTS document_visibility CASCADE;
DROP TYPE IF EXISTS attestation_type CASCADE;
DROP TYPE IF EXISTS verification_outcome CASCADE;
DROP TYPE IF EXISTS revocation_ground CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS parcel_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

COMMIT;
