-- ============================================================================
-- Anagu Land Administration Framework — Migration 007 (UP)
-- Completes remaining Phase 3 domain tables:
--   * Account KYC & identity verification records
--   * Application processing status history & legal review records
--   * Document verification history & fine-grained access grants
--   * Marketplace payment/escrow transactions, commissions & settlements
--   * Administrative configuration store
--   * Least-privilege PostgreSQL role/privilege helper setup
-- ============================================================================

BEGIN;

-- ── 1. Account Verification / KYC Records ───────────────────────────────────
CREATE TABLE IF NOT EXISTS account_verifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_type   TEXT NOT NULL CHECK (
        verification_type IN ('EMAIL', 'PHONE', 'NIN_IDENTITY', 'SURVEYOR_LICENSE', 'INSTITUTIONAL_ID')
    ),
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')
    ),
    reference_hash      VARCHAR(64),
    verified_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    notes               TEXT,
    verified_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acct_verif_user   ON account_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_acct_verif_status ON account_verifications(status);

DROP TRIGGER IF EXISTS trg_account_verifications_updated_at ON account_verifications;
CREATE TRIGGER trg_account_verifications_updated_at
    BEFORE UPDATE ON account_verifications FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── 2. Application Processing History (Append-Only Lifecycle Ledger) ────────
CREATE TABLE IF NOT EXISTS application_status_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status     application_status,
    to_status       application_status NOT NULL,
    stage           TEXT NOT NULL,
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role      user_role,
    notes           TEXT,
    transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_history_app ON application_status_history(application_id, transitioned_at DESC);

-- ── 3. Legal Review & Statutory Approval Records ────────────────────────────
CREATE TABLE IF NOT EXISTS legal_reviews (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id              UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    parcel_id                   UUID NOT NULL REFERENCES parcels(id) ON DELETE RESTRICT,
    legal_officer_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    clearance_status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        clearance_status IN ('PENDING', 'CLEARED', 'QUERIED', 'REJECTED')
    ),
    encumbrance_check_passed    BOOLEAN NOT NULL DEFAULT FALSE,
    statutory_compliance_passed BOOLEAN NOT NULL DEFAULT FALSE,
    lua_1978_compliant          BOOLEAN NOT NULL DEFAULT FALSE,
    clearance_hash              VARCHAR(64),
    findings                    TEXT,
    reviewed_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_reviews_app    ON legal_reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_legal_reviews_status ON legal_reviews(clearance_status);

DROP TRIGGER IF EXISTS trg_legal_reviews_updated_at ON legal_reviews;
CREATE TRIGGER trg_legal_reviews_updated_at
    BEFORE UPDATE ON legal_reviews FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── 4. Document Categories, Verification History & Access Permissions ───────
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS document_category TEXT NOT NULL DEFAULT 'OWNERSHIP_PROOF' CHECK (
        document_category IN ('IDENTITY', 'SURVEY', 'OWNERSHIP_PROOF', 'LEGAL', 'CERTIFICATE', 'CORRESPONDENCE')
    );

CREATE TABLE IF NOT EXISTS document_verifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    verified_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    decision            TEXT NOT NULL CHECK (decision IN ('VERIFIED', 'REJECTED', 'FLAGGED')),
    computed_sha256     VARCHAR(64) NOT NULL,
    checksum_matched    BOOLEAN NOT NULL,
    notes               TEXT,
    verified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_verifications_doc ON document_verifications(document_id);

CREATE TABLE IF NOT EXISTS document_access_grants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    grantee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grantee_role    user_role,
    access_level    TEXT NOT NULL DEFAULT 'VIEW' CHECK (access_level IN ('VIEW', 'DOWNLOAD', 'VERIFY')),
    granted_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_doc_grant_target CHECK (grantee_user_id IS NOT NULL OR grantee_role IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_doc_grants_doc  ON document_access_grants(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_grants_user ON document_access_grants(grantee_user_id);

-- ── 5. Marketplace Payment, Escrow, Commission & Settlement Records ─────────
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_ref             VARCHAR(64) NOT NULL UNIQUE,
    listing_id              UUID REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
    land_transfer_id        UUID REFERENCES land_transfers(id) ON DELETE RESTRICT,
    buyer_user_id           UUID REFERENCES users(id) ON DELETE RESTRICT,
    seller_user_id          UUID REFERENCES users(id) ON DELETE RESTRICT,
    payer_address           VARCHAR(42) NOT NULL,
    payee_address           VARCHAR(42) NOT NULL,
    escrow_contract_address VARCHAR(42),
    escrow_status           TEXT NOT NULL DEFAULT 'INITIATED' CHECK (
        escrow_status IN ('INITIATED', 'ESCROWED', 'RELEASE_PENDING', 'SETTLED', 'REFUNDED', 'DISPUTED')
    ),
    gross_amount            NUMERIC(24, 6) NOT NULL CHECK (gross_amount > 0),
    currency                VARCHAR(16) NOT NULL DEFAULT 'POL',
    chain_id                BIGINT NOT NULL DEFAULT 80002,
    escrow_tx_hash          VARCHAR(66),
    blockchain_tx_id        UUID REFERENCES blockchain_transactions(id) ON DELETE SET NULL,
    initiated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    escrowed_at             TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_listing  ON payment_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_payments_transfer ON payment_transactions(land_transfer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON payment_transactions(escrow_status);

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE IF NOT EXISTS platform_commissions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_transaction_id  UUID NOT NULL UNIQUE REFERENCES payment_transactions(id) ON DELETE RESTRICT,
    commission_rate_bps     INTEGER NOT NULL CHECK (commission_rate_bps BETWEEN 0 AND 2500),
    commission_amount       NUMERIC(24, 6) NOT NULL CHECK (commission_amount >= 0),
    currency                VARCHAR(16) NOT NULL DEFAULT 'POL',
    treasury_address        VARCHAR(42),
    status                  TEXT NOT NULL DEFAULT 'ACCRUED' CHECK (
        status IN ('ACCRUED', 'COLLECTED', 'WAIVED', 'REVERSED')
    ),
    collected_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlement_records (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_ref          VARCHAR(64) NOT NULL UNIQUE,
    payment_transaction_id  UUID NOT NULL UNIQUE REFERENCES payment_transactions(id) ON DELETE RESTRICT,
    land_transfer_id        UUID REFERENCES land_transfers(id) ON DELETE RESTRICT,
    net_seller_amount       NUMERIC(24, 6) NOT NULL CHECK (net_seller_amount >= 0),
    commission_amount       NUMERIC(24, 6) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
    currency                VARCHAR(16) NOT NULL DEFAULT 'POL',
    settlement_tx_hash      VARCHAR(66),
    blockchain_tx_id        UUID REFERENCES blockchain_transactions(id) ON DELETE SET NULL,
    status                  TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')
    ),
    settled_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlement_records(status);

-- ── 6. Administrative Configuration Store ───────────────────────────────────
CREATE TABLE IF NOT EXISTS administrative_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key      TEXT NOT NULL UNIQUE,
    config_value    JSONB NOT NULL,
    category        TEXT NOT NULL CHECK (
        category IN ('GIS', 'ORACLE', 'BLOCKCHAIN', 'STORAGE', 'MARKETPLACE', 'SECURITY', 'SYSTEM')
    ),
    description     TEXT,
    is_sensitive    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_administrative_configs_updated_at ON administrative_configs;
CREATE TRIGGER trg_administrative_configs_updated_at
    BEFORE UPDATE ON administrative_configs FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── 7. Least-Privilege Database Role (anagu_app_role) ───────────────────────
-- Non-superuser role for backend runtime (SELECT/INSERT/UPDATE on operational tables;
-- SELECT/INSERT ONLY on immutable append-only audit/history tables).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anagu_app_role') THEN
        CREATE ROLE anagu_app_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anagu_app_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anagu_app_role;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_events FROM anagu_app_role;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE application_status_history FROM anagu_app_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE schema_migrations FROM anagu_app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anagu_app_role;

COMMIT;
