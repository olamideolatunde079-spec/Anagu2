-- ============================================================================
-- Anagu Land Administration Framework — Migration 004 (UP)
-- Ownership Verification Oracle, Community & Institutional Attestations,
-- and Private Document Metadata References (MinIO)
-- ============================================================================

BEGIN;

-- ── Oracle Verification Records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oracle_verifications (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id              UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    checked_by_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    outcome                     TEXT NOT NULL,
    score                       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    institutional_match_score   INTEGER CHECK (institutional_match_score IS NULL OR institutional_match_score BETWEEN 0 AND 100),
    community_quorum_met        BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_hash               VARCHAR(64),
    reasons                     JSONB,
    raw_response                JSONB,
    verified_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oracle_application ON oracle_verifications(application_id);
CREATE INDEX IF NOT EXISTS idx_oracle_outcome     ON oracle_verifications(outcome);

DROP TRIGGER IF EXISTS trg_oracle_verifications_updated_at ON oracle_verifications;
CREATE TRIGGER trg_oracle_verifications_updated_at
    BEFORE UPDATE ON oracle_verifications
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Community & Institutional Attestations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS attestations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    parcel_id               UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    oracle_verification_id  UUID REFERENCES oracle_verifications(id) ON DELETE SET NULL,
    attestation_type        attestation_type NOT NULL,
    attester_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    attester_name           TEXT NOT NULL,
    attester_national_id    TEXT,
    attester_role_or_title  TEXT,
    institution_id          UUID REFERENCES institutions(id) ON DELETE SET NULL,
    statement               TEXT,
    decision                TEXT NOT NULL CHECK (
        decision IN ('ENDORSED', 'CONFLICT', 'ABSTAINED', 'PENDING')
    ),
    confidence_weight       INTEGER NOT NULL DEFAULT 1 CHECK (confidence_weight BETWEEN 0 AND 100),
    signature_hash          TEXT,
    attested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestations_app    ON attestations(application_id);
CREATE INDEX IF NOT EXISTS idx_attestations_parcel ON attestations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_attestations_type   ON attestations(attestation_type);

-- ── Private Document Metadata (Files Stored in Private MinIO Buckets) ───────
CREATE TABLE IF NOT EXISTS documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    parcel_id           UUID REFERENCES parcels(id) ON DELETE SET NULL,
    document_type       TEXT NOT NULL,
    file_name           TEXT NOT NULL,
    bucket_name         TEXT NOT NULL DEFAULT 'land-documents',
    minio_key           TEXT NOT NULL UNIQUE,
    mime_type           TEXT NOT NULL DEFAULT 'application/pdf' CHECK (
        mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/tiff')
    ),
    file_hash           TEXT NOT NULL,
    file_size_bytes     BIGINT,
    visibility          document_visibility NOT NULL DEFAULT 'PRIVATE',
    is_private          BOOLEAN NOT NULL DEFAULT TRUE,
    encryption_alg      TEXT NOT NULL DEFAULT 'AES256',
    checksum_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    review_status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        review_status IN ('PENDING', 'VERIFIED', 'REJECTED')
    ),
    uploaded_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ,
    retention_until     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_documents_always_private CHECK (is_private = TRUE AND visibility = 'PRIVATE'),
    CONSTRAINT chk_documents_file_size CHECK (
        file_size_bytes IS NULL OR (file_size_bytes > 0 AND file_size_bytes <= 26214400)
    ),
    CONSTRAINT chk_documents_hash_nonempty CHECK (length(trim(file_hash)) >= 16)
);

CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_parcel      ON documents(parcel_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash        ON documents(file_hash);

COMMIT;
