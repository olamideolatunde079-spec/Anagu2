-- ============================================================================
-- Anagu Land Administration Framework — Development Seed 003
-- Development-only sample spatial parcel and institutional fixture references.
-- NOTE: Do NOT apply in production. Password hashes here are intentionally
-- disabled placeholders; local accounts must be provisioned via auth flows.
-- ============================================================================

BEGIN;

INSERT INTO parcels (
    id,
    parcel_number,
    geom,
    spatial_hash,
    status,
    overlap_tolerance_m,
    title_type,
    land_use,
    state_id,
    lga_id,
    jurisdiction_id,
    state,
    lga,
    address_desc
)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'ANAGU-LA-LIS-00001',
    ST_GeomFromText(
        'POLYGON((3.396 6.454, 3.397 6.454, 3.397 6.455, 3.396 6.455, 3.396 6.454))',
        4326
    ),
    decode('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'hex'),
    'ACTIVE'::parcel_status,
    0.5,
    'STATUTORY_C_OF_O',
    'COMMERCIAL',
    s.id,
    l.id,
    j.id,
    'Lagos',
    'Lagos Island',
    'Plot 1, Broad Street, Lagos Island — Dev GIS Overlap Reference Parcel'
FROM states s
LEFT JOIN lgas l ON l.code = 'LA-LIS'
LEFT JOIN jurisdictions j ON j.code = 'JUR-LA-MIN'
WHERE s.code = 'LA'
ON CONFLICT (id) DO NOTHING;

COMMIT;
