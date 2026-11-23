-- ============================================================
-- Anagu — PostgreSQL initialisation
-- Runs once when the container is first created.
-- ============================================================

-- Enable PostGIS (spatial queries)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable fuzzy string matching (for oracle name matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Verify PostGIS is active
SELECT PostGIS_Version();
