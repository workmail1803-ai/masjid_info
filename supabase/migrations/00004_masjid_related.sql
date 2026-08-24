-- ============================================================
-- MOSJID.INFO — Migration 00004: Masjid Related Tables
-- Images, contacts, ratings, verifications, submissions, corrections
-- ============================================================

-- ============================================================
-- Image source type enum
-- ============================================================
CREATE TYPE image_source_type AS ENUM (
  'admin_upload', 'representative_upload', 'user_submission',
  'licensed_third_party', 'open_license', 'external_reference'
);

CREATE TYPE moderation_status AS ENUM (
  'pending', 'approved', 'rejected'
);

-- ============================================================
-- Masjid Images — source-aware image model
-- ============================================================
CREATE TABLE masjid_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,

  -- Source tracking
  source_type image_source_type NOT NULL DEFAULT 'admin_upload',
  source_url TEXT,
  license TEXT,
  attribution_text TEXT,
  attribution_required BOOLEAN NOT NULL DEFAULT false,
  external_only BOOLEAN NOT NULL DEFAULT false,
  local_storage_allowed BOOLEAN NOT NULL DEFAULT true,

  -- Storage paths (null if external_only)
  storage_path TEXT,
  thumbnail_path TEXT,
  card_path TEXT,
  detail_path TEXT,
  hero_path TEXT,

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status moderation_status NOT NULL DEFAULT 'pending',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for masjid_images
CREATE INDEX idx_mi_masjid_id ON masjid_images (masjid_id);
CREATE INDEX idx_mi_status ON masjid_images (status);
CREATE INDEX idx_mi_primary ON masjid_images (masjid_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_mi_masjid_sort ON masjid_images (masjid_id, sort_order);
CREATE INDEX idx_mi_uploaded_by ON masjid_images (uploaded_by);

-- ============================================================
-- Masjid Contacts
-- ============================================================
CREATE TABLE masjid_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  contact_type VARCHAR(20) NOT NULL DEFAULT 'phone', -- phone, email, website
  label_bn TEXT,
  label_en TEXT,
  value TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mc_masjid_id ON masjid_contacts (masjid_id);
CREATE INDEX idx_mc_primary ON masjid_contacts (masjid_id, is_primary) WHERE is_primary = true;

-- ============================================================
-- Masjid Ratings
-- ============================================================
CREATE TABLE masjid_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  overall SMALLINT NOT NULL CHECK (overall BETWEEN 1 AND 5),
  cleanliness SMALLINT CHECK (cleanliness BETWEEN 1 AND 5),
  facilities SMALLINT CHECK (facilities BETWEEN 1 AND 5),
  accessibility SMALLINT CHECK (accessibility BETWEEN 1 AND 5),
  comment TEXT,
  status moderation_status NOT NULL DEFAULT 'pending',
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mr_masjid_id ON masjid_ratings (masjid_id);
CREATE INDEX idx_mr_user_id ON masjid_ratings (user_id);
CREATE INDEX idx_mr_status ON masjid_ratings (status);
CREATE INDEX idx_mr_masjid_approved ON masjid_ratings (masjid_id, status) WHERE status = 'approved';
-- Prevent duplicate ratings from same user on same mosque
CREATE UNIQUE INDEX idx_mr_unique_user_masjid ON masjid_ratings (masjid_id, user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- Masjid Verifications
-- ============================================================
CREATE TABLE masjid_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_source TEXT,
  verification_notes TEXT,
  previous_status verification_status,
  new_status verification_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mv_masjid_id ON masjid_verifications (masjid_id);
CREATE INDEX idx_mv_verified_by ON masjid_verifications (verified_by);
CREATE INDEX idx_mv_created_at ON masjid_verifications (created_at DESC);

-- ============================================================
-- Masjid Submissions (public queue)
-- ============================================================
CREATE TYPE submission_status AS ENUM (
  'pending_review', 'approved', 'rejected', 'merged'
);

CREATE TABLE masjid_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bn TEXT NOT NULL,
  name_en TEXT,
  division_id SMALLINT REFERENCES divisions(id),
  district_id SMALLINT REFERENCES districts(id),
  upazila_id SMALLINT REFERENCES upazilas(id),
  area_name_bn TEXT,
  address_bn TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  structure_type structure_type DEFAULT 'unknown',
  established_year SMALLINT,
  description_bn TEXT,
  contact_number VARCHAR(20),
  email VARCHAR(255),

  -- Submitter info
  submitter_name TEXT,
  submitter_contact TEXT,
  source_info TEXT,

  -- Moderation
  status submission_status NOT NULL DEFAULT 'pending_review',
  admin_notes TEXT,
  merged_with_masjid_id UUID REFERENCES masjids(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ms_status ON masjid_submissions (status);
CREATE INDEX idx_ms_district ON masjid_submissions (district_id);
CREATE INDEX idx_ms_created_at ON masjid_submissions (created_at DESC);
CREATE INDEX idx_ms_reviewed_by ON masjid_submissions (reviewed_by);

-- ============================================================
-- Correction Requests
-- ============================================================
CREATE TYPE correction_issue_type AS ENUM (
  'wrong_name', 'wrong_address', 'wrong_location', 'wrong_image',
  'wrong_phone', 'duplicate', 'mosque_closed', 'other'
);

CREATE TABLE correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  issue_type correction_issue_type NOT NULL,
  description TEXT,
  submitter_name TEXT,
  submitter_contact TEXT,
  status moderation_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cr_masjid_id ON correction_requests (masjid_id);
CREATE INDEX idx_cr_status ON correction_requests (status);
CREATE INDEX idx_cr_created_at ON correction_requests (created_at DESC);

-- ============================================================
-- Masjid Change History (audit trail for individual field changes)
-- ============================================================
CREATE TYPE change_action AS ENUM (
  'create', 'update', 'delete', 'verify', 'merge', 'import', 'reject'
);

CREATE TABLE masjid_change_history (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action change_action NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Use BRIN index for append-only time-series table (much smaller than B-tree)
CREATE INDEX idx_mch_masjid_id ON masjid_change_history (masjid_id);
CREATE INDEX idx_mch_created_at ON masjid_change_history USING BRIN (created_at);
CREATE INDEX idx_mch_action ON masjid_change_history (action);

-- ============================================================
-- Trigger: update masjid rating aggregates
-- ============================================================
CREATE OR REPLACE FUNCTION update_masjid_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE masjids SET
    rating_average = COALESCE((
      SELECT ROUND(AVG(overall)::NUMERIC, 2) FROM masjid_ratings
      WHERE masjid_id = COALESCE(NEW.masjid_id, OLD.masjid_id) AND status = 'approved'
    ), 0),
    rating_count = (
      SELECT COUNT(*) FROM masjid_ratings
      WHERE masjid_id = COALESCE(NEW.masjid_id, OLD.masjid_id) AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.masjid_id, OLD.masjid_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rating_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON masjid_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_masjid_rating();

-- ============================================================
-- Trigger: update has_image flag
-- ============================================================
CREATE OR REPLACE FUNCTION update_masjid_has_image()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE masjids SET has_image = EXISTS(
    SELECT 1 FROM masjid_images
    WHERE masjid_id = COALESCE(NEW.masjid_id, OLD.masjid_id) AND status = 'approved'
  )
  WHERE id = COALESCE(NEW.masjid_id, OLD.masjid_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_has_image
  AFTER INSERT OR UPDATE OR DELETE ON masjid_images
  FOR EACH ROW
  EXECUTE FUNCTION update_masjid_has_image();
