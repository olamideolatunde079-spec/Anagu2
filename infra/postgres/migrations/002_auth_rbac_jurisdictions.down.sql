-- ============================================================================
-- Anagu Land Administration Framework — Migration 002 (DOWN / ROLLBACK)
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS staff_profiles CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS jurisdictions CASCADE;
DROP TABLE IF EXISTS lgas CASCADE;
DROP TABLE IF EXISTS states CASCADE;

COMMIT;
