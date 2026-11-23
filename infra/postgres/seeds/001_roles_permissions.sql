-- ============================================================================
-- Anagu Land Administration Framework — Reference Seed 001
-- Statutory RBAC Roles and Permissions Matrix (Idempotent)
-- ============================================================================

BEGIN;

INSERT INTO roles (code, display_name, description, is_institutional) VALUES
    ('CITIZEN',            'Land Applicant / Holder (My ANAGU)', 'Ordinary land owner or applicant submitting registrations, viewing titles, and managing transfers.', FALSE),
    ('SURVEYOR',           'Licensed Surveyor',                   'Authorized surveyor submitting cadastral survey plans, coordinates, and GIS diagnostics.', TRUE),
    ('REGISTRAR',          'Land Registrar',                      'Statutory registrar reviewing legal compliance, approving applications, and issuing/transferring titles.', TRUE),
    ('LAND_ADMINISTRATOR', 'Land Administrator',                  'System and registry administrator managing institutional users, jurisdictions, and reports.', TRUE),
    ('GOVERNOR',           'State Governor / Statutory Authority','Statutory authority empowered under Land Use Act 1978 s.28 to revoke land titles.', TRUE)
ON CONFLICT (code) DO UPDATE SET
    display_name     = EXCLUDED.display_name,
    description      = EXCLUDED.description,
    is_institutional = EXCLUDED.is_institutional;

INSERT INTO permissions (code, resource, action, description) VALUES
    ('application:submit',        'application', 'submit',  'Submit land registration applications'),
    ('application:read_own',      'application', 'read_own','View own submitted applications'),
    ('application:read_all',      'application', 'read_all','View all applications within jurisdiction'),
    ('application:review_legal',  'application', 'review',  'Perform legal and statutory clearance review'),
    ('application:approve',       'application', 'approve', 'Approve or reject land registration applications'),
    ('parcel:submit_spatial',     'parcel',      'spatial', 'Submit surveyed parcel geometry and GIS plans'),
    ('parcel:read_all',           'parcel',      'read_all','View all cadastral parcel boundaries'),
    ('oracle:attest',             'oracle',      'attest',  'Record institutional or community verification attestations'),
    ('title:issue',               'title',       'issue',   'Authorize minting of LandTitleNFT'),
    ('title:transfer',            'title',       'transfer','Authorize registry-controlled land title transfer'),
    ('title:revoke',              'title',       'revoke',  'Invoke statutory revocation under LUA 1978 s.28'),
    ('document:upload_own',       'document',    'upload',  'Upload private supporting land documents'),
    ('document:verify',           'document',    'verify',  'Verify uploaded survey plans and deeds'),
    ('admin:manage_rbac',         'admin',       'rbac',    'Grant or revoke institutional roles and staff profiles'),
    ('admin:view_audit',          'admin',       'audit',   'Inspect immutable system audit logs and reports')
ON CONFLICT (code) DO NOTHING;

-- Map permissions to roles
WITH mapping(role_code, perm_code) AS (
    VALUES
        ('CITIZEN'::user_role, 'application:submit'),
        ('CITIZEN'::user_role, 'application:read_own'),
        ('CITIZEN'::user_role, 'document:upload_own'),

        ('SURVEYOR'::user_role, 'application:submit'),
        ('SURVEYOR'::user_role, 'application:read_own'),
        ('SURVEYOR'::user_role, 'parcel:submit_spatial'),
        ('SURVEYOR'::user_role, 'parcel:read_all'),
        ('SURVEYOR'::user_role, 'document:upload_own'),
        ('SURVEYOR'::user_role, 'document:verify'),

        ('REGISTRAR'::user_role, 'application:read_all'),
        ('REGISTRAR'::user_role, 'application:review_legal'),
        ('REGISTRAR'::user_role, 'application:approve'),
        ('REGISTRAR'::user_role, 'parcel:read_all'),
        ('REGISTRAR'::user_role, 'oracle:attest'),
        ('REGISTRAR'::user_role, 'title:issue'),
        ('REGISTRAR'::user_role, 'title:transfer'),
        ('REGISTRAR'::user_role, 'document:verify'),
        ('REGISTRAR'::user_role, 'admin:view_audit'),

        ('LAND_ADMINISTRATOR'::user_role, 'application:read_all'),
        ('LAND_ADMINISTRATOR'::user_role, 'parcel:read_all'),
        ('LAND_ADMINISTRATOR'::user_role, 'admin:manage_rbac'),
        ('LAND_ADMINISTRATOR'::user_role, 'admin:view_audit'),

        ('GOVERNOR'::user_role, 'application:read_all'),
        ('GOVERNOR'::user_role, 'parcel:read_all'),
        ('GOVERNOR'::user_role, 'title:revoke'),
        ('GOVERNOR'::user_role, 'admin:view_audit')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM mapping m
JOIN roles r ON r.code = m.role_code
JOIN permissions p ON p.code = m.perm_code
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
