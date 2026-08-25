-- ============================================================
-- MOSJID.INFO — Migration 00011: Mosque RBAC & Admin Claims
-- ============================================================
-- Adds per-mosque authority on top of the existing platform-wide
-- `profiles.role`. Platform roles stay exactly as they were:
--   user / moderator / admin / super_admin  → govern the PLATFORM
-- Mosque roles are new and scoped to one mosque at a time.
--
-- Also hardens the two existing SECURITY DEFINER helpers, which every
-- RLS policy in 00008 depends on. Without `SET search_path` a caller
-- can shadow `profiles` with a temp table and escalate privileges.
-- ============================================================

-- ============================================================
-- 1. Harden existing SECURITY DEFINER helpers (00008)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_moderator_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
  );
END;
$$;

-- Also harden the stats RPC from 00009 (SECURITY DEFINER, no search_path).
CREATE OR REPLACE FUNCTION get_directory_stats()
RETURNS TABLE (
  total_masjids     BIGINT,
  verified_masjids  BIGINT,
  districts_covered BIGINT,
  upazilas_covered  BIGINT,
  recently_added    BIGINT,
  pending_submissions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.masjids WHERE status = 'published')::BIGINT,
    (SELECT COUNT(*) FROM public.masjids WHERE status = 'published' AND verification_status = 'verified')::BIGINT,
    (SELECT COUNT(DISTINCT district_id) FROM public.masjids WHERE status = 'published')::BIGINT,
    (SELECT COUNT(DISTINCT upazila_id) FROM public.masjids WHERE status = 'published' AND upazila_id IS NOT NULL)::BIGINT,
    (SELECT COUNT(*) FROM public.masjids WHERE status = 'published' AND created_at > NOW() - INTERVAL '30 days')::BIGINT,
    (SELECT COUNT(*) FROM public.masjid_submissions WHERE status = 'pending_review')::BIGINT;
$$;

-- ============================================================
-- 2. Mosque-scoped roles
-- ============================================================
-- Deliberately NOT reusing `user_role`: that enum governs platform
-- authority. Mixing the two would make `profiles.role = 'admin'`
-- indistinguishable from "chairman of one mosque".
CREATE TYPE mosque_role AS ENUM (
  'owner',      -- registered the mosque, can manage memberships
  'chairman',
  'secretary',  -- profile, committee, announcements
  'treasurer',  -- finance, zakat, receipts
  'imam',       -- prayer times, religious events, announcements
  'muazzin',
  'editor',     -- approved public information only
  'viewer'      -- read-only dashboard
);

CREATE TYPE membership_status AS ENUM (
  'pending', 'active', 'suspended', 'revoked'
);

CREATE TABLE mosque_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role mosque_role NOT NULL DEFAULT 'viewer',
  status membership_status NOT NULL DEFAULT 'pending',

  -- Who granted this, and when it was decided
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One role per user per mosque. Changing role updates the row.
CREATE UNIQUE INDEX idx_mm_unique_user_masjid
  ON mosque_memberships (masjid_id, user_id);

CREATE INDEX idx_mm_masjid_id ON mosque_memberships (masjid_id);
CREATE INDEX idx_mm_user_id ON mosque_memberships (user_id);
CREATE INDEX idx_mm_status ON mosque_memberships (status);
-- Hot path: "what may this user do at this mosque right now"
CREATE INDEX idx_mm_active_lookup
  ON mosque_memberships (user_id, masjid_id, role)
  WHERE status = 'active';

CREATE TRIGGER trg_mm_updated_at BEFORE UPDATE ON mosque_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Mosque admin claims — register → platform verifies → access
-- ============================================================
-- A person claims they administer a mosque. A PLATFORM admin reviews
-- the evidence and approves. Approval is what creates the active
-- membership; the claimant can never self-approve.
CREATE TYPE claim_status AS ENUM (
  'pending', 'under_review', 'approved', 'rejected', 'withdrawn'
);

CREATE TABLE mosque_admin_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Claimant's stated identity and role at the mosque
  requested_role mosque_role NOT NULL DEFAULT 'secretary',
  full_name TEXT NOT NULL,
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  position_description TEXT,

  -- Evidence. Private storage paths only — never public URLs.
  evidence_note TEXT,
  evidence_document_path TEXT,

  status claim_status NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mac_masjid_id ON mosque_admin_claims (masjid_id);
CREATE INDEX idx_mac_user_id ON mosque_admin_claims (user_id);
CREATE INDEX idx_mac_status ON mosque_admin_claims (status);
CREATE INDEX idx_mac_created_at ON mosque_admin_claims (created_at DESC);
-- Only one live claim per user per mosque; resolved ones may repeat.
CREATE UNIQUE INDEX idx_mac_one_open_claim
  ON mosque_admin_claims (masjid_id, user_id)
  WHERE status IN ('pending', 'under_review');

CREATE TRIGGER trg_mac_updated_at BEFORE UPDATE ON mosque_admin_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. Permission helpers
-- ============================================================
-- All SECURITY DEFINER with a locked search_path, all STABLE so the
-- planner can cache them within a statement.

-- Current user's active role at a mosque, or NULL.
CREATE OR REPLACE FUNCTION mosque_role_of(p_masjid_id UUID)
RETURNS mosque_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.mosque_memberships
  WHERE masjid_id = p_masjid_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

-- Does the current user hold ANY active role at this mosque?
CREATE OR REPLACE FUNCTION is_mosque_member(p_masjid_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mosque_memberships
    WHERE masjid_id = p_masjid_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) OR public.is_admin();
$$;

-- Capability check. One place defines who may do what, so policies
-- read as `mosque_can(id, 'manage_finance')` instead of role lists
-- duplicated across dozens of tables.
CREATE OR REPLACE FUNCTION mosque_can(p_masjid_id UUID, p_capability TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role mosque_role;
BEGIN
  -- Platform admins may act anywhere.
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  v_role := public.mosque_role_of(p_masjid_id);
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN CASE p_capability
    -- Mosque profile, facilities, committee
    WHEN 'manage_profile' THEN
      v_role IN ('owner', 'chairman', 'secretary', 'editor')
    WHEN 'manage_committee' THEN
      v_role IN ('owner', 'chairman', 'secretary')
    WHEN 'manage_staff' THEN
      v_role IN ('owner', 'chairman', 'secretary')

    -- Religious operations
    WHEN 'manage_prayer_times' THEN
      v_role IN ('owner', 'chairman', 'imam', 'muazzin', 'secretary')
    WHEN 'manage_events' THEN
      v_role IN ('owner', 'chairman', 'secretary', 'imam', 'editor')
    WHEN 'manage_announcements' THEN
      v_role IN ('owner', 'chairman', 'secretary', 'imam', 'editor')
    WHEN 'manage_services' THEN
      v_role IN ('owner', 'chairman', 'secretary')

    -- Money. Deliberately narrow.
    WHEN 'manage_finance' THEN
      v_role IN ('owner', 'chairman', 'treasurer')
    WHEN 'publish_finance' THEN
      v_role IN ('owner', 'chairman', 'treasurer')
    WHEN 'manage_zakat' THEN
      v_role IN ('owner', 'chairman', 'treasurer')
    WHEN 'manage_campaigns' THEN
      v_role IN ('owner', 'chairman', 'treasurer', 'secretary')
    WHEN 'manage_projects' THEN
      v_role IN ('owner', 'chairman', 'treasurer', 'secretary')

    -- Documents & membership
    WHEN 'manage_documents' THEN
      v_role IN ('owner', 'chairman', 'secretary', 'treasurer')
    WHEN 'manage_members' THEN
      v_role IN ('owner', 'chairman')

    -- Everyone with a seat can read the dashboard
    WHEN 'view_dashboard' THEN TRUE

    ELSE FALSE
  END;
END;
$$;

-- ============================================================
-- 5. Approving a claim — the ONLY path to an active membership
-- ============================================================
-- SECURITY DEFINER so it can write the membership row, but it opens
-- with a hard platform-admin gate. A mosque editor calling this
-- directly gets an exception, not a membership.
CREATE OR REPLACE FUNCTION approve_mosque_claim(
  p_claim_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim public.mosque_admin_claims%ROWTYPE;
  v_membership_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only platform administrators may approve mosque claims'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_claim
  FROM public.mosque_admin_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF v_claim.id IS NULL THEN
    RAISE EXCEPTION 'Claim % not found', p_claim_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_claim.status NOT IN ('pending', 'under_review') THEN
    RAISE EXCEPTION 'Claim % is already %', p_claim_id, v_claim.status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.mosque_memberships
    (masjid_id, user_id, role, status, granted_by, granted_at, notes)
  VALUES
    (v_claim.masjid_id, v_claim.user_id, v_claim.requested_role, 'active',
     auth.uid(), now(), p_notes)
  ON CONFLICT (masjid_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        granted_by = EXCLUDED.granted_by,
        granted_at = now(),
        revoked_at = NULL,
        notes = EXCLUDED.notes
  RETURNING id INTO v_membership_id;

  UPDATE public.mosque_admin_claims
  SET status = 'approved',
      review_notes = p_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_claim_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    auth.uid(), 'approve', 'mosque_admin_claim', p_claim_id::TEXT,
    jsonb_build_object(
      'masjid_id', v_claim.masjid_id,
      'granted_user_id', v_claim.user_id,
      'role', v_claim.requested_role
    )
  );

  RETURN v_membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION reject_mosque_claim(
  p_claim_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only platform administrators may reject mosque claims'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.mosque_admin_claims
  SET status = 'rejected',
      review_notes = p_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_claim_id
    AND status IN ('pending', 'under_review');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim % is not open for review', p_claim_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(), 'reject', 'mosque_admin_claim', p_claim_id::TEXT,
          jsonb_build_object('notes', p_notes));
END;
$$;

-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE mosque_memberships ENABLE ROW LEVEL SECURITY;

-- A user sees their own memberships; mosque managers see their mosque's.
CREATE POLICY "Users read own memberships" ON mosque_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Mosque managers read memberships" ON mosque_memberships
  FOR SELECT USING (mosque_can(masjid_id, 'manage_members'));

CREATE POLICY "Mosque managers write memberships" ON mosque_memberships
  FOR INSERT WITH CHECK (mosque_can(masjid_id, 'manage_members'));

CREATE POLICY "Mosque managers update memberships" ON mosque_memberships
  FOR UPDATE USING (mosque_can(masjid_id, 'manage_members'))
  WITH CHECK (mosque_can(masjid_id, 'manage_members'));

CREATE POLICY "Platform admin manages memberships" ON mosque_memberships
  FOR ALL USING (is_admin());

ALTER TABLE mosque_admin_claims ENABLE ROW LEVEL SECURITY;

-- Anyone signed in may file a claim for themselves — and only themselves.
CREATE POLICY "Users create own claims" ON mosque_admin_claims
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own claims" ON mosque_admin_claims
  FOR SELECT USING (user_id = auth.uid());

-- Claimants may withdraw, but may never move their own claim to
-- 'approved' — the WITH CHECK pins the only status they can set.
CREATE POLICY "Users withdraw own claims" ON mosque_admin_claims
  FOR UPDATE USING (user_id = auth.uid() AND status IN ('pending', 'under_review'))
  WITH CHECK (user_id = auth.uid() AND status = 'withdrawn');

CREATE POLICY "Moderators read all claims" ON mosque_admin_claims
  FOR SELECT USING (is_moderator_or_above());

CREATE POLICY "Platform admin manages claims" ON mosque_admin_claims
  FOR ALL USING (is_admin());

-- ============================================================
-- 7. Let mosque members read their own mosque's unpublished row
-- ============================================================
-- 00008 only allows public SELECT on published mosques and
-- moderator-or-above on everything. A mosque's own team needs to see
-- its draft record to edit it.
CREATE POLICY "Mosque members read own masjid" ON masjids
  FOR SELECT USING (is_mosque_member(id));

CREATE POLICY "Mosque managers update own masjid" ON masjids
  FOR UPDATE USING (mosque_can(id, 'manage_profile'))
  WITH CHECK (mosque_can(id, 'manage_profile'));

COMMENT ON TABLE mosque_memberships IS
  'Per-mosque authority. Distinct from profiles.role, which is platform-wide.';
COMMENT ON TABLE mosque_admin_claims IS
  'Requests to administer a mosque. Only a platform admin can approve, via approve_mosque_claim().';
COMMENT ON FUNCTION mosque_can(UUID, TEXT) IS
  'Single source of truth for mosque capabilities. RLS policies call this instead of listing roles.';
