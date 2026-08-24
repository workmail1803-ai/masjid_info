-- ============================================================
-- MOSJID.INFO — Migration 00003: Core Masjids Table
-- The heart of the system — optimized for 300K+ records
-- ============================================================

-- Structure type enum
CREATE TYPE structure_type AS ENUM (
  'small', 'medium', 'large', 'multi_storey',
  'tin_shed', 'semi_permanent', 'under_construction', 'unknown'
);

-- Verification status enum
CREATE TYPE verification_status AS ENUM (
  'unverified', 'pending', 'verified', 'needs_review', 'rejected', 'archived'
);

-- Publish status enum
CREATE TYPE publish_status AS ENUM (
  'draft', 'published', 'archived'
);

-- National sequence for central_code (MZ-000001)
CREATE SEQUENCE masjid_central_seq START WITH 1 INCREMENT BY 1;

-- District serial tracking table
CREATE TABLE district_serials (
  district_id SMALLINT PRIMARY KEY REFERENCES districts(id) ON DELETE RESTRICT,
  last_serial INT NOT NULL DEFAULT 0
);

-- Initialize district serials for all existing districts
INSERT INTO district_serials (district_id, last_serial)
SELECT id, 0 FROM districts;

-- ============================================================
-- Main Masjids Table
-- ============================================================
CREATE TABLE masjids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identifiers (immutable after creation)
  central_code VARCHAR(12) NOT NULL UNIQUE,
  district_code VARCHAR(16) NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,

  -- Names
  name_bn TEXT NOT NULL,
  name_en TEXT,

  -- Location references (foreign keys for fast joins)
  division_id SMALLINT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  district_id SMALLINT NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  upazila_id SMALLINT REFERENCES upazilas(id) ON DELETE SET NULL,

  -- Free-text location
  area_name_bn TEXT,
  area_name_en TEXT,
  address_bn TEXT,
  address_en TEXT,

  -- Coordinates
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Details
  structure_type structure_type NOT NULL DEFAULT 'unknown',
  description_bn TEXT,
  description_en TEXT,
  established_year SMALLINT,

  -- Contact
  contact_number VARCHAR(20),
  email VARCHAR(255),

  -- Aggregated ratings (updated via trigger)
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,

  -- Data quality flags (computed, lightweight booleans)
  has_image BOOLEAN NOT NULL DEFAULT false,
  has_contact BOOLEAN NOT NULL DEFAULT false,

  -- Verification
  verification_status verification_status NOT NULL DEFAULT 'unverified',

  -- Publish status
  status publish_status NOT NULL DEFAULT 'draft',

  -- Data provenance
  source_type VARCHAR(50),
  source_name TEXT,
  source_url TEXT,
  source_record_id TEXT,
  collected_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,

  -- Generated search column (populated by trigger)
  search_text TEXT NOT NULL DEFAULT '',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES — Comprehensive for fast queries on 300K+ rows
-- ============================================================

-- Primary lookup indexes
CREATE INDEX idx_masjids_central_code ON masjids (central_code);
CREATE INDEX idx_masjids_district_code ON masjids (district_code);
CREATE INDEX idx_masjids_slug ON masjids (slug);

-- Foreign key indexes (critical for JOIN performance)
CREATE INDEX idx_masjids_division_id ON masjids (division_id);
CREATE INDEX idx_masjids_district_id ON masjids (district_id);
CREATE INDEX idx_masjids_upazila_id ON masjids (upazila_id);

-- Filter indexes
CREATE INDEX idx_masjids_structure_type ON masjids (structure_type);
CREATE INDEX idx_masjids_verification ON masjids (verification_status);
CREATE INDEX idx_masjids_status ON masjids (status);
CREATE INDEX idx_masjids_has_image ON masjids (has_image) WHERE has_image = true;
CREATE INDEX idx_masjids_has_contact ON masjids (has_contact) WHERE has_contact = true;

-- Temporal indexes
CREATE INDEX idx_masjids_created_at ON masjids (created_at DESC);
CREATE INDEX idx_masjids_updated_at ON masjids (updated_at DESC);

-- Composite indexes for common directory queries
-- "Published mosques in a district, newest first"
CREATE INDEX idx_masjids_district_status_created
  ON masjids (district_id, status, created_at DESC)
  WHERE status = 'published';

-- "Published mosques in an upazila"
CREATE INDEX idx_masjids_upazila_status
  ON masjids (upazila_id, status)
  WHERE status = 'published';

-- "Published verified mosques"
CREATE INDEX idx_masjids_verified_published
  ON masjids (verification_status, status)
  WHERE status = 'published' AND verification_status = 'verified';

-- Coordinate index for spatial queries (bounding box)
CREATE INDEX idx_masjids_coords
  ON masjids (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Search index — trigram GIN for fuzzy Bangla + English search
CREATE INDEX idx_masjids_search_trgm
  ON masjids USING GIN (search_text gin_trgm_ops);

-- ============================================================
-- FUNCTIONS for ID generation
-- ============================================================

-- Generate central_code: MZ-000001 format
CREATE OR REPLACE FUNCTION generate_central_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.central_code IS NULL OR NEW.central_code = '' THEN
    NEW.central_code := 'MZ-' || LPAD(nextval('masjid_central_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate district_code: DHK-000001 format
CREATE OR REPLACE FUNCTION generate_district_code()
RETURNS TRIGGER AS $$
DECLARE
  v_district_code VARCHAR(4);
  v_serial INT;
BEGIN
  IF NEW.district_code IS NULL OR NEW.district_code = '' THEN
    SELECT code INTO v_district_code FROM districts WHERE id = NEW.district_id;

    UPDATE district_serials
    SET last_serial = last_serial + 1
    WHERE district_id = NEW.district_id
    RETURNING last_serial INTO v_serial;

    IF v_serial IS NULL THEN
      INSERT INTO district_serials (district_id, last_serial)
      VALUES (NEW.district_id, 1)
      ON CONFLICT (district_id) DO UPDATE SET last_serial = district_serials.last_serial + 1
      RETURNING last_serial INTO v_serial;
    END IF;

    NEW.district_code := v_district_code || '-' || LPAD(v_serial::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Build search_text from name + location fields
CREATE OR REPLACE FUNCTION build_search_text()
RETURNS TRIGGER AS $$
DECLARE
  v_div_bn TEXT;
  v_div_en TEXT;
  v_dist_bn TEXT;
  v_dist_en TEXT;
  v_upz_bn TEXT;
  v_upz_en TEXT;
BEGIN
  SELECT name_bn, name_en INTO v_div_bn, v_div_en FROM divisions WHERE id = NEW.division_id;
  SELECT name_bn, name_en INTO v_dist_bn, v_dist_en FROM districts WHERE id = NEW.district_id;
  IF NEW.upazila_id IS NOT NULL THEN
    SELECT name_bn, name_en INTO v_upz_bn, v_upz_en FROM upazilas WHERE id = NEW.upazila_id;
  END IF;

  NEW.search_text := LOWER(
    COALESCE(NEW.name_bn, '') || ' ' ||
    COALESCE(NEW.name_en, '') || ' ' ||
    COALESCE(NEW.area_name_bn, '') || ' ' ||
    COALESCE(NEW.area_name_en, '') || ' ' ||
    COALESCE(NEW.address_bn, '') || ' ' ||
    COALESCE(NEW.address_en, '') || ' ' ||
    COALESCE(v_div_bn, '') || ' ' ||
    COALESCE(v_div_en, '') || ' ' ||
    COALESCE(v_dist_bn, '') || ' ' ||
    COALESCE(v_dist_en, '') || ' ' ||
    COALESCE(v_upz_bn, '') || ' ' ||
    COALESCE(v_upz_en, '') || ' ' ||
    COALESCE(NEW.central_code, '') || ' ' ||
    COALESCE(NEW.district_code, '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_masjid_central_code
  BEFORE INSERT ON masjids
  FOR EACH ROW
  EXECUTE FUNCTION generate_central_code();

CREATE TRIGGER trg_masjid_district_code
  BEFORE INSERT ON masjids
  FOR EACH ROW
  EXECUTE FUNCTION generate_district_code();

CREATE TRIGGER trg_masjid_search_text
  BEFORE INSERT OR UPDATE OF name_bn, name_en, area_name_bn, area_name_en,
    address_bn, address_en, division_id, district_id, upazila_id
  ON masjids
  FOR EACH ROW
  EXECUTE FUNCTION build_search_text();

CREATE TRIGGER trg_masjid_updated_at
  BEFORE UPDATE ON masjids
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
