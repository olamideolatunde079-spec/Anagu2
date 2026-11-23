-- ============================================================================
-- Anagu Land Administration Framework — Migration 006 (DOWN / ROLLBACK)
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_events;
DROP TRIGGER IF EXISTS trg_audit_compute_hash ON audit_events;
DROP FUNCTION IF EXISTS fn_prevent_audit_mutation() CASCADE;
DROP FUNCTION IF EXISTS fn_audit_compute_hash() CASCADE;

DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS mqtt_events CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

COMMIT;
