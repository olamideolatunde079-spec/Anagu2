-- ============================================================================
-- Anagu Land Administration Framework — Migration 002 (UP)
-- Jurisdictions (States, LGAs, Cadastral Offices), Users & Auth Sessions,
-- RBAC (Roles, Permissions, Assignments), and Institutional Staff Profiles
-- ============================================================================

BEGIN;

-- ── States ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS states (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(16) NOT NULL UNIQUE,
    name                TEXT NOT NULL UNIQUE,
    geopolitical_zone   TEXT,
    boundary            GEOMETRY(MULTIPOLYGON, 4326),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_states_boundary_valid CHECK (boundary IS NULL OR ST_IsValid(boundary))
);

CREATE INDEX IF NOT EXISTS idx_states_code     ON states(code);
CREATE INDEX IF NOT EXISTS idx_states_boundary ON states USING GIST(boundary);

-- ── Local Government Areas (LGAs) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id        UUID NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    code            VARCHAR(24) NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    headquarters    TEXT,
    boundary        GEOMETRY(MULTIPOLYGON, 4326),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lga_state_name UNIQUE (state_id, name),
    CONSTRAINT chk_lgas_boundary_valid CHECK (boundary IS NULL OR ST_IsValid(boundary))
);

CREATE INDEX IF NOT EXISTS idx_lgas_state    ON lgas(state_id);
CREATE INDEX IF NOT EXISTS idx_lgas_boundary ON lgas USING GIST(boundary);

-- ── Cadastral / Administrative Jurisdictions ────────────────────────────────
CREATE TABLE IF NOT EXISTS jurisdictions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(32) NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    jurisdiction_type   TEXT NOT NULL CHECK (
        jurisdiction_type IN (
            'STATE_MINISTRY',
            'ZONAL_LAND_REGISTRY',
            'LGA_CADASTRAL_OFFICE',
            'SURVEYOR_GENERAL_OFFICE'
        )
    ),
    state_id            UUID REFERENCES states(id) ON DELETE RESTRICT,
    lga_id              UUID REFERENCES lgas(id) ON DELETE RESTRICT,
    boundary            GEOMETRY(MULTIPOLYGON, 4326),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_jurisdictions_boundary_valid CHECK (boundary IS NULL OR ST_IsValid(boundary))
);

CREATE INDEX IF NOT EXISTS idx_jurisdictions_state    ON jurisdictions(state_id);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_lga      ON jurisdictions(lga_id);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_boundary ON jurisdictions USING GIST(boundary);

-- ── Users & Auth References ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT,
    full_name           TEXT NOT NULL,
    national_id         TEXT UNIQUE,
    phone               TEXT,
    role                user_role NOT NULL DEFAULT 'CITIZEN',
    wallet_address      VARCHAR(42),
    auth_provider       TEXT NOT NULL DEFAULT 'LOCAL',
    external_auth_id    TEXT UNIQUE,
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_wallet_format CHECK (
        wallet_address IS NULL OR wallet_address ~ '^0x[a-fA-F0-9]{40}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_wallet      ON users(wallet_address);

-- ── Auth Sessions / Refresh Token References ────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  TEXT NOT NULL UNIQUE,
    device_id           TEXT,
    user_agent          TEXT,
    ip_address          INET,
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user    ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- ── RBAC: Roles, Permissions & Assignments ──────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                user_role NOT NULL UNIQUE,
    display_name        TEXT NOT NULL,
    description         TEXT,
    is_institutional    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        TEXT NOT NULL UNIQUE,
    resource    TEXT NOT NULL,
    action      TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE SET NULL,
    granted_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_user_role_jurisdiction
    ON user_roles (user_id, role_id, COALESCE(jurisdiction_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE revoked_at IS NULL;

-- ── Government & Institutional Entities ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(32) NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    institution_type    TEXT NOT NULL CHECK (
        institution_type IN (
            'MINISTRY_OF_LANDS',
            'SURVEYOR_GENERAL',
            'JUDICIARY',
            'COMMUNITY_COUNCIL',
            'GIS_AGENCY'
        )
    ),
    state_id            UUID REFERENCES states(id) ON DELETE RESTRICT,
    lga_id              UUID REFERENCES lgas(id) ON DELETE RESTRICT,
    contact_email       TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    institution_id          UUID REFERENCES institutions(id) ON DELETE RESTRICT,
    jurisdiction_id         UUID REFERENCES jurisdictions(id) ON DELETE RESTRICT,
    staff_number            TEXT NOT NULL UNIQUE,
    designation             TEXT NOT NULL,
    license_number          TEXT UNIQUE,
    license_expires_at      DATE,
    appointment_date        DATE,
    is_authorized_signer    BOOLEAN NOT NULL DEFAULT FALSE,
    status                  TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN ('ACTIVE', 'SUSPENDED', 'RETIRED', 'REVOKED')
    ),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_institution  ON staff_profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_jurisdiction ON staff_profiles(jurisdiction_id);

-- ── Triggers ────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_states_updated_at ON states;
CREATE TRIGGER trg_states_updated_at
    BEFORE UPDATE ON states FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_lgas_updated_at ON lgas;
CREATE TRIGGER trg_lgas_updated_at
    BEFORE UPDATE ON lgas FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_jurisdictions_updated_at ON jurisdictions;
CREATE TRIGGER trg_jurisdictions_updated_at
    BEFORE UPDATE ON jurisdictions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_institutions_updated_at ON institutions;
CREATE TRIGGER trg_institutions_updated_at
    BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
    BEFORE UPDATE ON staff_profiles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMIT;
