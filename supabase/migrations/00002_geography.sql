-- ============================================================
-- MOSJID.INFO — Migration 00002: Geography Tables
-- Bangladesh administrative hierarchy: Division → District → Upazila
-- ============================================================

-- Divisions (8 rows)
CREATE TABLE divisions (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code VARCHAR(4) NOT NULL UNIQUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for divisions
CREATE INDEX idx_divisions_slug ON divisions (slug);
CREATE INDEX idx_divisions_code ON divisions (code);
CREATE INDEX idx_divisions_sort ON divisions (sort_order);

-- Districts (64 rows)
CREATE TABLE districts (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  division_id SMALLINT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code VARCHAR(4) NOT NULL UNIQUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for districts
CREATE INDEX idx_districts_division_id ON districts (division_id);
CREATE INDEX idx_districts_slug ON districts (slug);
CREATE INDEX idx_districts_code ON districts (code);
CREATE INDEX idx_districts_sort ON districts (sort_order);
CREATE INDEX idx_districts_name_en ON districts (name_en);

-- Upazilas (~500 rows)
CREATE TABLE upazilas (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  district_id SMALLINT NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code VARCHAR(8),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for upazilas
CREATE INDEX idx_upazilas_district_id ON upazilas (district_id);
CREATE INDEX idx_upazilas_slug ON upazilas (slug);
CREATE INDEX idx_upazilas_sort ON upazilas (sort_order);
CREATE INDEX idx_upazilas_name_en ON upazilas (name_en);

-- Composite indexes for common join queries
CREATE INDEX idx_districts_division_sort ON districts (division_id, sort_order);
CREATE INDEX idx_upazilas_district_sort ON upazilas (district_id, sort_order);
