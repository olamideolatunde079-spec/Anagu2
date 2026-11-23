-- ============================================================================
-- Anagu Land Administration Framework — Migration 005 (UP)
-- Blockchain Transaction References (Polygon Amoy / EVM), Land Titles (NFTs),
-- Ownership History, Land Transfers, and Marketplace Listings
-- ============================================================================

BEGIN;

-- ── Blockchain Transaction References ───────────────────────────────────────
-- Stores on-chain transaction metadata only (no confidential docs or PII).
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id                    BIGINT NOT NULL DEFAULT 80002,
    network_name                TEXT NOT NULL DEFAULT 'polygon_amoy',
    contract_address            VARCHAR(42) NOT NULL,
    tx_hash                     VARCHAR(66) NOT NULL UNIQUE,
    block_number                BIGINT,
    block_hash                  VARCHAR(66),
    tx_type                     blockchain_tx_type NOT NULL,
    status                      blockchain_tx_status NOT NULL DEFAULT 'PENDING',
    from_address                VARCHAR(42) NOT NULL,
    to_address                  VARCHAR(42),
    gas_used                    BIGINT,
    effective_gas_price_wei     NUMERIC(78, 0),
    nonce                       BIGINT,
    related_entity_type         TEXT,
    related_entity_id           UUID,
    error_message               TEXT,
    submitted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_btx_contract_addr CHECK (contract_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT chk_btx_tx_hash       CHECK (tx_hash ~ '^0x[a-fA-F0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_btx_chain_status ON blockchain_transactions(chain_id, status);
CREATE INDEX IF NOT EXISTS idx_btx_entity       ON blockchain_transactions(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_btx_block        ON blockchain_transactions(block_number);

-- ── Land Titles (ERC-721 NFTs) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS land_titles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_number        VARCHAR(64) UNIQUE,
    token_id            BIGINT NOT NULL UNIQUE,
    chain_id            BIGINT NOT NULL DEFAULT 80002,
    contract_address    VARCHAR(42),
    parcel_id           UUID NOT NULL REFERENCES parcels(id) ON DELETE RESTRICT,
    application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    owner_address       VARCHAR(42) NOT NULL,
    owner_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    tx_hash             VARCHAR(66) NOT NULL,
    blockchain_tx_id    UUID REFERENCES blockchain_transactions(id) ON DELETE SET NULL,
    block_number        BIGINT,
    spatial_hash_hex    VARCHAR(66),
    metadata_hash       VARCHAR(66),
    token_uri           TEXT,
    is_revoked          BOOLEAN NOT NULL DEFAULT FALSE,
    revocation_tx       VARCHAR(66),
    revocation_tx_id    UUID REFERENCES blockchain_transactions(id) ON DELETE SET NULL,
    revocation_ground   revocation_ground,
    revoked_by_address  VARCHAR(42),
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at          TIMESTAMPTZ,
    CONSTRAINT chk_titles_owner_addr CHECK (owner_address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX IF NOT EXISTS idx_titles_parcel     ON land_titles(parcel_id);
CREATE INDEX IF NOT EXISTS idx_titles_owner      ON land_titles(owner_address);
CREATE INDEX IF NOT EXISTS idx_titles_owner_user ON land_titles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_titles_token_id   ON land_titles(token_id);
CREATE INDEX IF NOT EXISTS idx_titles_is_revoked ON land_titles(is_revoked);

-- ── Land Title Ownership Ledger (Historical + Current Owners) ───────────────
CREATE TABLE IF NOT EXISTS title_ownership_history (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_title_id           UUID NOT NULL REFERENCES land_titles(id) ON DELETE RESTRICT,
    owner_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_address           VARCHAR(42) NOT NULL,
    ownership_share_bps     INTEGER NOT NULL DEFAULT 10000 CHECK (ownership_share_bps BETWEEN 1 AND 10000),
    acquisition_type        TEXT NOT NULL DEFAULT 'ORIGINAL_GRANT' CHECK (
        acquisition_type IN ('ORIGINAL_GRANT', 'TRANSFER', 'INHERITANCE', 'COURT_ORDER')
    ),
    tx_hash                 VARCHAR(66),
    is_current              BOOLEAN NOT NULL DEFAULT TRUE,
    acquired_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    relinquished_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ownership_title_current ON title_ownership_history(land_title_id, is_current);
CREATE INDEX IF NOT EXISTS idx_ownership_user          ON title_ownership_history(owner_user_id);

-- ── Land Transfers & Transaction History ────────────────────────────────────
CREATE TABLE IF NOT EXISTS land_transfers (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_ref            VARCHAR(64) NOT NULL UNIQUE,
    land_title_id           UUID NOT NULL REFERENCES land_titles(id) ON DELETE RESTRICT,
    parcel_id               UUID NOT NULL REFERENCES parcels(id) ON DELETE RESTRICT,
    seller_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    seller_address          VARCHAR(42) NOT NULL,
    buyer_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    buyer_address           VARCHAR(42) NOT NULL,
    registrar_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    consideration_amount    NUMERIC(24, 6) CHECK (consideration_amount IS NULL OR consideration_amount >= 0),
    currency                VARCHAR(16) NOT NULL DEFAULT 'POL',
    escrow_tx_hash          VARCHAR(66),
    settlement_tx_hash      VARCHAR(66),
    blockchain_tx_id        UUID REFERENCES blockchain_transactions(id) ON DELETE SET NULL,
    status                  transfer_status NOT NULL DEFAULT 'REQUESTED',
    rejection_reason        TEXT,
    requested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at             TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_transfer_distinct_parties CHECK (lower(seller_address) <> lower(buyer_address))
);

CREATE INDEX IF NOT EXISTS idx_transfers_title  ON land_transfers(land_title_id);
CREATE INDEX IF NOT EXISTS idx_transfers_seller ON land_transfers(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_buyer  ON land_transfers(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON land_transfers(status);

DROP TRIGGER IF EXISTS trg_land_transfers_updated_at ON land_transfers;
CREATE TRIGGER trg_land_transfers_updated_at
    BEFORE UPDATE ON land_transfers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Marketplace Listings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_ref         VARCHAR(64) NOT NULL UNIQUE,
    land_title_id       UUID NOT NULL REFERENCES land_titles(id) ON DELETE RESTRICT,
    parcel_id           UUID NOT NULL REFERENCES parcels(id) ON DELETE RESTRICT,
    seller_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_address      VARCHAR(42) NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    asking_price        NUMERIC(24, 6) NOT NULL CHECK (asking_price > 0),
    currency            VARCHAR(16) NOT NULL DEFAULT 'POL',
    chain_id            BIGINT NOT NULL DEFAULT 80002,
    status              listing_status NOT NULL DEFAULT 'DRAFT',
    is_title_verified   BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_title  ON marketplace_listings(land_title_id);
CREATE INDEX IF NOT EXISTS idx_listings_parcel ON marketplace_listings(parcel_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON marketplace_listings(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_listing_per_title
    ON marketplace_listings(land_title_id)
    WHERE status IN ('ACTIVE', 'UNDER_OFFER', 'ESCROW_LOCKED');

DROP TRIGGER IF EXISTS trg_marketplace_listings_updated_at ON marketplace_listings;
CREATE TRIGGER trg_marketplace_listings_updated_at
    BEFORE UPDATE ON marketplace_listings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMIT;
