-- ============================================================================
-- ANAGU — Migration 008: Parcel Photo Gallery
-- Stores metadata for private MinIO land photos.
-- Only APPROVED photos may appear in public parcel galleries.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS parcel_photos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id           UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    uploaded_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    object_key          TEXT NOT NULL UNIQUE,
    original_file_name  TEXT NOT NULL,
    mime_type           VARCHAR(50) NOT NULL CHECK (
        mime_type IN ('image/jpeg', 'image/png', 'image/webp')
    ),
    file_size_bytes     BIGINT NOT NULL CHECK (
        file_size_bytes > 0 AND file_size_bytes <= 8388608
    ),
    sha256              VARCHAR(64) NOT NULL,

    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED')
    ),
    is_cover            BOOLEAN NOT NULL DEFAULT FALSE,
    display_order       INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),

    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_parcel_photo_review
        CHECK (
            (status = 'PENDING' AND reviewed_at IS NULL)
            OR
            (status IN ('APPROVED', 'REJECTED') AND reviewed_at IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_parcel_photos_gallery
    ON parcel_photos(parcel_id, status, display_order, created_at);

CREATE INDEX IF NOT EXISTS idx_parcel_photos_application
    ON parcel_photos(application_id);

CREATE INDEX IF NOT EXISTS idx_parcel_photos_uploader
    ON parcel_photos(uploaded_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parcel_photos_one_cover
    ON parcel_photos(parcel_id)
    WHERE status = 'APPROVED' AND is_cover = TRUE;

DROP TRIGGER IF EXISTS trg_parcel_photos_updated_at ON parcel_photos;

CREATE TRIGGER trg_parcel_photos_updated_at
    BEFORE UPDATE ON parcel_photos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Explicit permissions for the backend runtime role.
GRANT SELECT, INSERT, UPDATE ON parcel_photos TO anagu_app_role;
REVOKE DELETE, TRUNCATE ON parcel_photos FROM anagu_app_role;

COMMIT;
