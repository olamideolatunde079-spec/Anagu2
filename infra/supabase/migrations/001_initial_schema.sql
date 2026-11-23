-- ============================================================
-- Anagu — Supabase Initial Schema Migration
-- 001_initial_schema.sql
--
-- Creates tables in Supabase that mirror the primary PostgreSQL schema
-- so that Realtime subscriptions (postgres_changes) work for:
--   - applications  (citizen status updates)
--   - land_titles   (registrar issuance events)
--
-- All foreign key constraints and Row Level Security (RLS) policies
-- are defined here.
--
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- Or: supabase db push (if using Supabase CLI)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enum types ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'SUBMITTED', 'SPATIAL_VERIFIED', 'OWNERSHIP_VERIFIED',
    'LEGAL_VERIFIED', 'APPROVED', 'BLOCKCHAIN_REGISTERED',
    'NFT_ISSUED', 'COMPLETED', 'REJECTED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'CITIZEN', 'SURVEYOR', 'REGISTRAR', 'LAND_ADMINISTRATOR', 'GOVERNOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE parcel_status AS ENUM (
    'PENDING', 'ACTIVE', 'REVOKED', 'DISPUTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE revocation_ground AS ENUM (
    'OVERRIDING_PUBLIC_INTEREST', 'BREACH_OF_STATUTORY_CONDITION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    national_id     TEXT UNIQUE,
    phone           TEXT,
    role            user_role NOT NULL DEFAULT 'CITIZEN',
    wallet_address  VARCHAR(42),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);

-- ── Parcels ───────────────────────────────────────────────────────────────────
-- Note: PostGIS is NOT available in Supabase by default on the free tier.
-- The geometry column is stored as TEXT (WKT) here for Supabase Realtime compatibility.
-- The primary spatial database (PostgreSQL + PostGIS) remains the authoritative source.
CREATE TABLE IF NOT EXISTS parcels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    geom_wkt        TEXT,                   -- WKT representation (no PostGIS here)
    spatial_hash    TEXT NOT NULL,          -- hex keccak256 of WKT
    area_sqm        DOUBLE PRECISION,
    status          parcel_status NOT NULL DEFAULT 'PENDING',
    lga             TEXT,
    state           TEXT,
    address_desc    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);

-- ── Applications ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id           UUID NOT NULL REFERENCES parcels(id),
    applicant_id        UUID NOT NULL REFERENCES users(id),
    owner_name          TEXT NOT NULL,
    national_id         TEXT NOT NULL,
    survey_plan_number  TEXT,
    community_witnesses JSONB,
    legal_clearance_hash TEXT,
    status              application_status NOT NULL DEFAULT 'SUBMITTED',
    rejection_stage     TEXT,
    rejection_reason    TEXT,
    registrar_id        UUID REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_parcel    ON applications(parcel_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status    ON applications(status);

-- ── Documents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES applications(id),
    document_type   TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    minio_key       TEXT NOT NULL UNIQUE,
    file_hash       TEXT NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);

-- ── Land titles ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS land_titles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id            BIGINT UNIQUE NOT NULL,
    parcel_id           UUID NOT NULL REFERENCES parcels(id),
    application_id      UUID NOT NULL REFERENCES applications(id),
    owner_address       VARCHAR(42) NOT NULL,
    owner_user_id       UUID REFERENCES users(id),
    tx_hash             VARCHAR(66) NOT NULL,
    block_number        BIGINT,
    token_uri           TEXT,
    is_revoked          BOOLEAN DEFAULT FALSE,
    revocation_tx       VARCHAR(66),
    revocation_ground   revocation_ground,
    revoked_by_address  VARCHAR(42),
    issued_at           TIMESTAMPTZ DEFAULT NOW(),
    revoked_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_titles_parcel     ON land_titles(parcel_id);
CREATE INDEX IF NOT EXISTS idx_titles_owner      ON land_titles(owner_address);
CREATE INDEX IF NOT EXISTS idx_titles_token_id   ON land_titles(token_id);
CREATE INDEX IF NOT EXISTS idx_titles_is_revoked ON land_titles(is_revoked);

-- ── Oracle verifications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oracle_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES applications(id),
    outcome         TEXT NOT NULL,
    score           INTEGER NOT NULL,
    reasons         JSONB,
    raw_response    JSONB,
    verified_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oracle_application ON oracle_verifications(application_id);

-- ── MQTT events ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mqtt_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic           TEXT NOT NULL,
    payload         JSONB NOT NULL,
    qos             SMALLINT NOT NULL DEFAULT 1,
    payload_bytes   INTEGER,
    delivered       BOOLEAN DEFAULT FALSE,
    published_at    TIMESTAMPTZ DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mqtt_topic     ON mqtt_events(topic);
CREATE INDEX IF NOT EXISTS idx_mqtt_published ON mqtt_events(published_at);

-- ── Audit events (immutable) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    event_type      TEXT NOT NULL,
    from_status     TEXT,
    to_status       TEXT,
    actor_role      user_role,
    actor_id        TEXT NOT NULL,
    actor_address   VARCHAR(42),
    metadata        JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);

-- Immutability: prevent updates and deletes on audit_events
CREATE OR REPLACE RULE no_update_audit AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit AS ON DELETE TO audit_events DO INSTEAD NOTHING;

-- ── Row Level Security (RLS) ──────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_titles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events       ENABLE ROW LEVEL SECURITY;

-- ── Service role bypass (NestJS backend uses service role key) ──────────────
-- The service role bypasses RLS by default in Supabase.
-- No explicit policy needed — service role can do everything.

-- ── applications: citizens can read their own ─────────────────────────────────
DROP POLICY IF EXISTS "applications_select_own" ON applications;
CREATE POLICY "applications_select_own"
  ON applications FOR SELECT
  USING (applicant_id = auth.uid());

DROP POLICY IF EXISTS "applications_insert_own" ON applications;
CREATE POLICY "applications_insert_own"
  ON applications FOR INSERT
  WITH CHECK (applicant_id = auth.uid());

-- Registrars, admins, and governors can read all applications
DROP POLICY IF EXISTS "applications_select_staff" ON applications;
CREATE POLICY "applications_select_staff"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('REGISTRAR', 'LAND_ADMINISTRATOR', 'GOVERNOR')
    )
  );

-- Registrars can update application status
DROP POLICY IF EXISTS "applications_update_registrar" ON applications;
CREATE POLICY "applications_update_registrar"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'REGISTRAR'
    )
  );

-- ── land_titles: owners can read their own ────────────────────────────────────
DROP POLICY IF EXISTS "land_titles_select_own" ON land_titles;
CREATE POLICY "land_titles_select_own"
  ON land_titles FOR SELECT
  USING (owner_user_id = auth.uid());

-- Registrars, admins, governors can read all titles
DROP POLICY IF EXISTS "land_titles_select_staff" ON land_titles;
CREATE POLICY "land_titles_select_staff"
  ON land_titles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('REGISTRAR', 'LAND_ADMINISTRATOR', 'GOVERNOR')
    )
  );

-- ── audit_events: admin/registrar/governor can read ──────────────────────────
DROP POLICY IF EXISTS "audit_events_select_staff" ON audit_events;
CREATE POLICY "audit_events_select_staff"
  ON audit_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('REGISTRAR', 'LAND_ADMINISTRATOR', 'GOVERNOR')
    )
  );

-- ── parcels: authenticated users can read all (public parcel boundaries) ──────
DROP POLICY IF EXISTS "parcels_select_authenticated" ON parcels;
CREATE POLICY "parcels_select_authenticated"
  ON parcels FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── documents: applicants can read their own documents ────────────────────────
DROP POLICY IF EXISTS "documents_select_own" ON documents;
CREATE POLICY "documents_select_own"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = documents.application_id
        AND applications.applicant_id = auth.uid()
    )
  );

-- ── Enable Realtime on key tables ────────────────────────────────────────────
-- Run these statements to enable Supabase Realtime:
-- (These are run separately after the migration; see README.md)
--
--   ALTER PUBLICATION supabase_realtime ADD TABLE applications;
--   ALTER PUBLICATION supabase_realtime ADD TABLE land_titles;
--
-- Do NOT include in this migration file as supabase_realtime publication
-- must be altered via the Supabase dashboard or CLI separately.
