-- ============================================================================
-- Anagu Land Administration Framework — Migration 001 (UP)
-- Extensions, Migration Tracking, and Domain Enumerated Types
-- Target: PostgreSQL 15+ with PostGIS 3+ (WGS 84 / EPSG:4326)
-- ============================================================================

BEGIN;

-- ── Required Extensions ─────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Migration History Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
    version         VARCHAR(64) PRIMARY KEY,
    description     TEXT NOT NULL,
    checksum_sha256 VARCHAR(64),
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by      TEXT NOT NULL DEFAULT CURRENT_USER
);

-- ── Domain Enumerated Types (idempotent creation) ───────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'CITIZEN',
        'SURVEYOR',
        'REGISTRAR',
        'LAND_ADMINISTRATOR',
        'GOVERNOR'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE parcel_status AS ENUM (
        'PENDING',
        'ACTIVE',
        'REVOKED',
        'DISPUTED',
        'SUBDIVIDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM (
        'SUBMITTED',
        'SPATIAL_VERIFIED',
        'OWNERSHIP_VERIFIED',
        'LEGAL_VERIFIED',
        'APPROVED',
        'BLOCKCHAIN_REGISTERED',
        'NFT_ISSUED',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE revocation_ground AS ENUM (
        'OVERRIDING_PUBLIC_INTEREST',
        'BREACH_OF_STATUTORY_CONDITION'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE verification_outcome AS ENUM (
        'VERIFIED',
        'INCOMPLETE_DOCUMENTS',
        'OWNERSHIP_CONFLICT',
        'LEGAL_PENDING',
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE attestation_type AS ENUM (
        'COMMUNITY_ELDER',
        'TRADITIONAL_RULER',
        'NEIGHBOR_WITNESS',
        'INSTITUTIONAL_REGISTRY',
        'LICENSED_SURVEYOR'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_visibility AS ENUM (
        'PRIVATE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE blockchain_tx_type AS ENUM (
        'ISSUE_TITLE',
        'TRANSFER_TITLE',
        'REVOKE_TITLE',
        'ESCROW_DEPOSIT',
        'ESCROW_RELEASE',
        'ESCROW_REFUND'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE blockchain_tx_status AS ENUM (
        'PENDING',
        'SUBMITTED',
        'CONFIRMED',
        'FAILED',
        'REVERTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM (
        'REQUESTED',
        'ESCROWED',
        'LEGAL_CLEARED',
        'REGISTRAR_APPROVED',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM (
        'DRAFT',
        'ACTIVE',
        'UNDER_OFFER',
        'ESCROW_LOCKED',
        'SOLD',
        'CANCELLED',
        'SUSPENDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM (
        'IN_APP',
        'MQTT',
        'EMAIL',
        'SMS'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Shared Updated-At Trigger Function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMIT;
