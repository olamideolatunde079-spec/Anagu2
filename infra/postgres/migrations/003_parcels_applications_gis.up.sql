-- ============================================================================
-- Anagu Land Administration Framework — Migration 003 (UP)
-- Land Parcels (PostGIS EPSG:4326), Land Registration Applications,
-- Survey & GIS Verification Records, and Spatial Overlap Helper Functions
-- ============================================================================

BEGIN;

-- ── Land Parcels & Cadastral Information ────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcels (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_number           VARCHAR(64) UNIQUE,
    geom                    GEOMETRY(POLYGON, 4326) NOT NULL,
    centroid                GEOMETRY(POINT, 4326),
    spatial_hash            BYTEA NOT NULL,
    area_sqm                DOUBLE PRECISION,
    perimeter_m             DOUBLE PRECISION,
    srid                    INTEGER NOT NULL DEFAULT 4326,
    status                  parcel_status NOT NULL DEFAULT 'PENDING',
    overlap_tolerance_m     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    survey_accuracy_class   TEXT NOT NULL DEFAULT 'SUB_METRE',
    title_type              TEXT,
    land_use                TEXT,
    state_id                UUID REFERENCES states(id) ON DELETE RESTRICT,
    lga_id                  UUID REFERENCES lgas(id) ON DELETE RESTRICT,
    jurisdiction_id         UUID REFERENCES jurisdictions(id) ON DELETE RESTRICT,
    state                   TEXT,
    lga                     TEXT,
    address_desc            TEXT,
    parent_parcel_id        UUID REFERENCES parcels(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_parcels_srid CHECK (srid = 4326 AND ST_SRID(geom) = 4326),
    CONSTRAINT chk_parcels_geom_valid CHECK (ST_IsValid(geom)),
    CONSTRAINT chk_parcels_tolerance_range CHECK (overlap_tolerance_m >= 0 AND overlap_tolerance_m <= 50)
);

CREATE INDEX IF NOT EXISTS idx_parcels_geom         ON parcels USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_parcels_centroid     ON parcels USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_parcels_status       ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_state_lga    ON parcels(state_id, lga_id);
CREATE INDEX IF NOT EXISTS idx_parcels_jurisdiction ON parcels(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_parcels_spatial_hash ON parcels(spatial_hash);

-- ── Auto-compute area_sqm, perimeter_m, and centroid from geom ──────────────
CREATE OR REPLACE FUNCTION fn_compute_parcel_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.srid        := 4326;
    NEW.area_sqm    := ST_Area(NEW.geom::geography);
    NEW.perimeter_m := ST_Perimeter(NEW.geom::geography);
    NEW.centroid    := ST_Centroid(NEW.geom);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parcels_metrics ON parcels;
CREATE TRIGGER trg_parcels_metrics
    BEFORE INSERT OR UPDATE OF geom ON parcels
    FOR EACH ROW EXECUTE FUNCTION fn_compute_parcel_metrics();

DROP TRIGGER IF EXISTS trg_parcels_updated_at ON parcels;
CREATE TRIGGER trg_parcels_updated_at
    BEFORE UPDATE ON parcels
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── PostGIS Spatial Validation & Overlap Detection Functions ────────────────
CREATE OR REPLACE FUNCTION fn_validate_parcel_geometry(p_wkt TEXT)
RETURNS TABLE (
    is_valid    BOOLEAN,
    reason      TEXT,
    area_sqm    DOUBLE PRECISION,
    perimeter_m DOUBLE PRECISION,
    centroid_wkt TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_geom GEOMETRY;
BEGIN
    v_geom := ST_GeomFromText(p_wkt, 4326);
    RETURN QUERY
    SELECT
        ST_IsValid(v_geom),
        ST_IsValidReason(v_geom),
        CASE WHEN ST_IsValid(v_geom) THEN ST_Area(v_geom::geography) ELSE NULL END,
        CASE WHEN ST_IsValid(v_geom) THEN ST_Perimeter(v_geom::geography) ELSE NULL END,
        CASE WHEN ST_IsValid(v_geom) THEN ST_AsText(ST_Centroid(v_geom)) ELSE NULL END;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT, NULL::DOUBLE PRECISION, NULL::DOUBLE PRECISION, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION fn_check_parcel_overlap(
    p_geom               GEOMETRY,
    p_exclude_parcel_id  UUID DEFAULT NULL,
    p_tolerance_m        DOUBLE PRECISION DEFAULT 0.5
)
RETURNS TABLE (
    overlapping_parcel_id UUID,
    parcel_number         VARCHAR(64),
    status                parcel_status,
    overlap_area_sqm      DOUBLE PRECISION,
    distance_m            DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        existing.id AS overlapping_parcel_id,
        existing.parcel_number,
        existing.status,
        ST_Area(ST_Intersection(p_geom, existing.geom)::geography) AS overlap_area_sqm,
        ST_Distance(p_geom::geography, existing.geom::geography)   AS distance_m
    FROM parcels existing
    WHERE existing.status NOT IN ('REVOKED', 'SUBDIVIDED')
      AND (p_exclude_parcel_id IS NULL OR existing.id <> p_exclude_parcel_id)
      AND ST_Intersects(
            ST_Buffer(p_geom::geography, GREATEST(p_tolerance_m, 0))::geometry,
            existing.geom
          )
    ORDER BY overlap_area_sqm DESC, distance_m ASC;
$$;

-- ── Land Registration Applications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_ref         VARCHAR(64) UNIQUE,
    parcel_id               UUID NOT NULL REFERENCES parcels(id) ON DELETE RESTRICT,
    applicant_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    application_type        TEXT NOT NULL DEFAULT 'FIRST_REGISTRATION' CHECK (
        application_type IN (
            'FIRST_REGISTRATION',
            'RECTIFICATION',
            'SUBDIVISION',
            'CONSOLIDATION',
            'REISSUE'
        )
    ),
    owner_name              TEXT NOT NULL,
    national_id             TEXT NOT NULL,
    survey_plan_number      TEXT,
    community_witnesses     JSONB,
    legal_clearance_hash    TEXT,
    state_id                UUID REFERENCES states(id) ON DELETE RESTRICT,
    lga_id                  UUID REFERENCES lgas(id) ON DELETE RESTRICT,
    jurisdiction_id         UUID REFERENCES jurisdictions(id) ON DELETE RESTRICT,
    assigned_surveyor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    legal_officer_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    registrar_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    status                  application_status NOT NULL DEFAULT 'SUBMITTED',
    rejection_stage         TEXT,
    rejection_reason        TEXT,
    submitted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    spatial_verified_at     TIMESTAMPTZ,
    ownership_verified_at   TIMESTAMPTZ,
    legal_verified_at       TIMESTAMPTZ,
    approved_at             TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_parcel    ON applications(parcel_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status    ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_state_lga ON applications(state_id, lga_id);

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Survey & GIS Verification Records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS gis_verifications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID REFERENCES applications(id) ON DELETE CASCADE,
    parcel_id               UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    surveyor_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    survey_plan_number      TEXT,
    srid                    INTEGER NOT NULL DEFAULT 4326 CHECK (srid = 4326),
    st_is_valid             BOOLEAN NOT NULL,
    is_valid_reason         TEXT,
    overlap_detected        BOOLEAN NOT NULL DEFAULT FALSE,
    overlapping_parcel_ids  UUID[],
    overlap_area_sqm        DOUBLE PRECISION NOT NULL DEFAULT 0,
    overlap_tolerance_m     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    computed_area_sqm       DOUBLE PRECISION,
    spatial_hash            TEXT NOT NULL,
    diagnostic_message      TEXT,
    raw_wkt                 TEXT,
    verified_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gis_verifications_parcel ON gis_verifications(parcel_id);
CREATE INDEX IF NOT EXISTS idx_gis_verifications_app    ON gis_verifications(application_id);

COMMIT;
