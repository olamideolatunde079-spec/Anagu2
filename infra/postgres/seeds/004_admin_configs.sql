# ============================================================================
# Anagu Land Administration Framework — Reference Seed 004
# Default Non-Sensitive Administrative System Configuration
# ============================================================================

BEGIN;

INSERT INTO administrative_configs (config_key, config_value, category, description, is_sensitive) VALUES
    ('gis.coordinate_srid',            '4326'::jsonb,                           'GIS',         'Authoritative spatial reference system (WGS 84)', FALSE),
    ('gis.overlap_tolerance_metres',   '0.5'::jsonb,                            'GIS',         'Boundary buffer tolerance in metres for overlap detection', FALSE),
    ('storage.max_document_size_bytes','26214400'::jsonb,                       'STORAGE',     'Maximum private land document upload size (25 MiB)', FALSE),
    ('storage.allowed_mime_types',     '["application/pdf","image/jpeg","image/png","image/tiff"]'::jsonb, 'STORAGE', 'Permitted document MIME types for MinIO upload', FALSE),
    ('storage.private_buckets_only',   'true'::jsonb,                           'SECURITY',    'Enforces private-by-default MinIO object storage policy', FALSE),
    ('blockchain.active_chain_id',     '80002'::jsonb,                          'BLOCKCHAIN',  'Active EVM network ID (Polygon Amoy Testnet)', FALSE),
    ('blockchain.active_network',      '"polygon_amoy"'::jsonb,                 'BLOCKCHAIN',  'Active blockchain target network identifier', FALSE),
    ('marketplace.platform_fee_bps',   '150'::jsonb,                            'MARKETPLACE', 'Default marketplace commission basis points (1.50%)', FALSE),
    ('oracle.min_community_witnesses', '2'::jsonb,                              'ORACLE',      'Minimum community witness attestations required', FALSE)
ON CONFLICT (config_key) DO NOTHING;

COMMIT;
