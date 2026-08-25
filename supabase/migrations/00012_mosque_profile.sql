-- ============================================================
-- MOSJID.INFO — Migration 00012: Mosque Profile Content (Phase B)
-- Prayer times, staff, committee, services, facilities.
-- Extends existing tables where they already fit; new tables only
-- where nothing equivalent exists.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Facilities on the existing masjids table (no new table)
-- ------------------------------------------------------------
ALTER TABLE masjids
  ADD COLUMN IF NOT EXISTS capacity INT,
  ADD COLUMN IF NOT EXISTS floors SMALLINT,
  ADD COLUMN IF NOT EXISTS has_women_prayer_area BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_wudu_facility BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_toilet BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_parking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_wheelchair_accessible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ac BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_library BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS official_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS history_bn TEXT,
  ADD COLUMN IF NOT EXISTS history_en TEXT;

-- ------------------------------------------------------------
-- 2. Prayer times — one current row per mosque
-- ------------------------------------------------------------
CREATE TYPE prayer_schedule_kind AS ENUM ('daily', 'ramadan', 'eid');

CREATE TABLE prayer_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  kind prayer_schedule_kind NOT NULL DEFAULT 'daily',

  fajr TIME, sunrise TIME, dhuhr TIME, asr TIME, maghrib TIME, isha TIME,
  jumuah TIME, jumuah_khutbah TIME,
  taraweeh TIME,              -- ramadan
  sehri_end TIME, iftar TIME, -- ramadan
  eid_jamaat_1 TIME, eid_jamaat_2 TIME, eid_note_bn TEXT,

  note_bn TEXT,
  effective_from DATE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pt_masjid_kind ON prayer_times (masjid_id, kind);
CREATE INDEX idx_pt_masjid ON prayer_times (masjid_id);
CREATE TRIGGER trg_pt_updated_at BEFORE UPDATE ON prayer_times
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 3. Staff (imam / muazzin / khadem)
-- ------------------------------------------------------------
CREATE TYPE staff_position AS ENUM (
  'imam', 'assistant_imam', 'muazzin', 'khadem', 'teacher', 'security', 'other'
);

CREATE TABLE mosque_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  position staff_position NOT NULL DEFAULT 'imam',
  position_label_bn TEXT,
  qualifications_bn TEXT,
  languages TEXT[],
  serving_since DATE,
  photo_path TEXT,
  bio_bn TEXT,

  -- PRIVACY: personal numbers are private by default. The public page shows the
  -- mosque's official_phone and a contact form, never these columns, unless the
  -- staff member explicitly consented.
  private_phone VARCHAR(20),
  private_email VARCHAR(255),
  contact_consent_public BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ms_masjid ON mosque_staff (masjid_id);
CREATE INDEX idx_ms_active ON mosque_staff (masjid_id, is_active, sort_order) WHERE is_active;
CREATE TRIGGER trg_mstaff_updated_at BEFORE UPDATE ON mosque_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Public projection: never exposes private contact columns unless consented.
CREATE OR REPLACE VIEW public_mosque_staff
WITH (security_invoker = true) AS
SELECT
  s.id, s.masjid_id, s.name_bn, s.name_en, s.position, s.position_label_bn,
  s.qualifications_bn, s.languages, s.serving_since, s.photo_path, s.bio_bn,
  s.sort_order,
  CASE WHEN s.contact_consent_public THEN s.private_phone END AS public_phone,
  CASE WHEN s.contact_consent_public THEN s.private_email END AS public_email
FROM mosque_staff s
WHERE s.is_active;

-- ------------------------------------------------------------
-- 4. Management committee
-- ------------------------------------------------------------
CREATE TABLE mosque_committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  role mosque_role,                 -- reuses the 00011 enum where it maps
  role_label_bn TEXT NOT NULL,      -- free text for roles outside the enum
  photo_path TEXT,
  term_start DATE,
  term_end DATE,
  formation_date DATE,
  private_phone VARCHAR(20),
  contact_consent_public BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcm_masjid ON mosque_committee_members (masjid_id);
CREATE INDEX idx_mcm_active ON mosque_committee_members (masjid_id, is_active, sort_order) WHERE is_active;
CREATE TRIGGER trg_mcm_updated_at BEFORE UPDATE ON mosque_committee_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 5. Community services
-- ------------------------------------------------------------
CREATE TABLE community_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  description_bn TEXT,
  icon TEXT,
  contact_note_bn TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_masjid ON community_services (masjid_id, is_active, sort_order);
CREATE TRIGGER trg_cs_updated_at BEFORE UPDATE ON community_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 6. Extend existing content tables for per-mosque scope
-- ------------------------------------------------------------
-- notices → mosque announcements (was platform-only)
ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS masjid_id UUID REFERENCES masjids(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notices_masjid
  ON notices (masjid_id, published_at DESC) WHERE status = 'published';

-- activities → mosque events (already had masjid_id)
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS speaker_bn TEXT,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS requires_registration BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_note_bn TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_act_masjid_date
  ON activities (masjid_id, event_date DESC) WHERE status = 'published';

-- ------------------------------------------------------------
-- 7. RLS — public reads published, mosque team writes
-- ------------------------------------------------------------
ALTER TABLE prayer_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read prayer times" ON prayer_times FOR SELECT USING (true);
CREATE POLICY "Team manages prayer times" ON prayer_times FOR ALL
  USING (mosque_can(masjid_id, 'manage_prayer_times'))
  WITH CHECK (mosque_can(masjid_id, 'manage_prayer_times'));

ALTER TABLE mosque_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active staff" ON mosque_staff FOR SELECT USING (is_active);
CREATE POLICY "Team manages staff" ON mosque_staff FOR ALL
  USING (mosque_can(masjid_id, 'manage_staff'))
  WITH CHECK (mosque_can(masjid_id, 'manage_staff'));

ALTER TABLE mosque_committee_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read committee" ON mosque_committee_members FOR SELECT USING (is_active);
CREATE POLICY "Team manages committee" ON mosque_committee_members FOR ALL
  USING (mosque_can(masjid_id, 'manage_committee'))
  WITH CHECK (mosque_can(masjid_id, 'manage_committee'));

ALTER TABLE community_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read services" ON community_services FOR SELECT USING (is_active);
CREATE POLICY "Team manages services" ON community_services FOR ALL
  USING (mosque_can(masjid_id, 'manage_services'))
  WITH CHECK (mosque_can(masjid_id, 'manage_services'));

-- Mosque teams may manage their own notices/activities.
CREATE POLICY "Team manages own notices" ON notices FOR ALL
  USING (masjid_id IS NOT NULL AND mosque_can(masjid_id, 'manage_announcements'))
  WITH CHECK (masjid_id IS NOT NULL AND mosque_can(masjid_id, 'manage_announcements'));

CREATE POLICY "Team manages own activities" ON activities FOR ALL
  USING (masjid_id IS NOT NULL AND mosque_can(masjid_id, 'manage_events'))
  WITH CHECK (masjid_id IS NOT NULL AND mosque_can(masjid_id, 'manage_events'));

COMMENT ON VIEW public_mosque_staff IS
  'Staff projection that withholds private contact details unless the member consented.';
