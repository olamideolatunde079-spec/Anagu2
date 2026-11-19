-- ============================================================================
-- Anagu Land Administration Framework — Reference Seed 002
-- Nigerian States, FCT Abuja, Representative LGAs, Cadastral Jurisdictions,
-- and State Land Registry Institutions (Idempotent)
-- ============================================================================

BEGIN;

INSERT INTO states (code, name, geopolitical_zone) VALUES
    ('AB', 'Abia',        'South East'),
    ('AD', 'Adamawa',     'North East'),
    ('AK', 'Akwa Ibom',   'South South'),
    ('AN', 'Anambra',     'South East'),
    ('BA', 'Bauchi',      'North East'),
    ('BY', 'Bayelsa',     'South South'),
    ('BE', 'Benue',       'North Central'),
    ('BO', 'Borno',       'North East'),
    ('CR', 'Cross River', 'South South'),
    ('DE', 'Delta',       'South South'),
    ('EB', 'Ebonyi',      'South East'),
    ('ED', 'Edo',         'South South'),
    ('EK', 'Ekiti',       'South West'),
    ('EN', 'Enugu',       'South East'),
    ('FC', 'FCT Abuja',   'North Central'),
    ('GO', 'Gombe',       'North East'),
    ('IM', 'Imo',         'South East'),
    ('JI', 'Jigawa',      'North West'),
    ('KD', 'Kaduna',      'North West'),
    ('KN', 'Kano',        'North West'),
    ('KT', 'Katsina',     'North West'),
    ('KE', 'Kebbi',       'North West'),
    ('KO', 'Kogi',        'North Central'),
    ('KW', 'Kwara',       'North Central'),
    ('LA', 'Lagos',       'South West'),
    ('NA', 'Nasarawa',    'North Central'),
    ('NI', 'Niger',       'North Central'),
    ('OG', 'Ogun',        'South West'),
    ('ON', 'Ondo',        'South West'),
    ('OS', 'Osun',        'South West'),
    ('OY', 'Oyo',         'South West'),
    ('PL', 'Plateau',     'North Central'),
    ('RI', 'Rivers',      'South South'),
    ('SO', 'Sokoto',      'North West'),
    ('TA', 'Taraba',      'North East'),
    ('YO', 'Yobe',        'North East'),
    ('ZA', 'Zamfara',     'North West')
ON CONFLICT (code) DO NOTHING;

-- Representative LGAs across primary cadastral pilot jurisdictions
WITH lga_seed(state_code, lga_code, lga_name, hq) AS (
    VALUES
        ('LA', 'LA-LIS', 'Lagos Island',      'Lagos Island'),
        ('LA', 'LA-ETI', 'Eti-Osa',           'Ikoyi / Lekki'),
        ('LA', 'LA-IKJ', 'Ikeja',             'Ikeja'),
        ('LA', 'LA-IBL', 'Ibeju-Lekki',       'Akodo'),
        ('LA', 'LA-SUR', 'Surulere',          'Surulere'),
        ('FC', 'FC-AMA', 'Abuja Municipal',   'Garki'),
        ('FC', 'FC-BWA', 'Bwari',             'Bwari'),
        ('FC', 'FC-GWA', 'Gwagwalada',        'Gwagwalada'),
        ('FC', 'FC-KUJ', 'Kuje',              'Kuje'),
        ('OG', 'OG-ADO', 'Ado-Odo/Ota',       'Ota'),
        ('OG', 'OG-ABK', 'Abeokuta South',    'Ake'),
        ('OG', 'OG-SAG', 'Sagamu',            'Sagamu'),
        ('OY', 'OY-IBN', 'Ibadan North',      'Agodi'),
        ('OY', 'OY-IBS', 'Ibadan South-West', 'Oluyole'),
        ('RI', 'RI-PHC', 'Port Harcourt',     'Port Harcourt'),
        ('RI', 'RI-OBI', 'Obio/Akpor',        'Rumuodomaya'),
        ('EN', 'EN-ENN', 'Enugu North',       'Enugu'),
        ('EN', 'EN-ENS', 'Enugu South',       'Uwani'),
        ('AN', 'AN-AWK', 'Awka South',        'Awka'),
        ('AN', 'AN-ONI', 'Onitsha North',     'Onitsha'),
        ('KN', 'KN-KMC', 'Kano Municipal',    'Kano'),
        ('KN', 'KN-NAS', 'Nasarawa',          'Bompai'),
        ('KD', 'KD-KDN', 'Kaduna North',      'Magajin Gari'),
        ('KD', 'KD-KDS', 'Kaduna South',      'Makera')
)
INSERT INTO lgas (state_id, code, name, headquarters)
SELECT s.id, l.lga_code, l.lga_name, l.hq
FROM lga_seed l
JOIN states s ON s.code = l.state_code
ON CONFLICT (code) DO NOTHING;

-- State-level Cadastral Jurisdictions & Land Registry Ministries
INSERT INTO jurisdictions (code, name, jurisdiction_type, state_id)
SELECT
    'JUR-' || s.code || '-MIN',
    s.name || ' State Land Registry Jurisdiction',
    'STATE_MINISTRY',
    s.id
FROM states s
ON CONFLICT (code) DO NOTHING;

INSERT INTO institutions (code, name, institution_type, state_id)
SELECT
    'INST-' || s.code || '-MOL',
    CASE
        WHEN s.code = 'FC' THEN 'Abuja Geographic Information Systems (AGIS)'
        ELSE s.name || ' State Ministry of Lands & Survey'
    END,
    CASE WHEN s.code = 'FC' THEN 'GIS_AGENCY' ELSE 'MINISTRY_OF_LANDS' END,
    s.id
FROM states s
ON CONFLICT (code) DO NOTHING;

COMMIT;
