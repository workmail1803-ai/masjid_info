-- ============================================================
-- MOSJID.INFO — Migration 00013: Finance, Zakat, Campaigns,
-- Projects, Documents (Phase C)
--
-- ACCOUNTING RULE: no derived total is ever stored as the source of
-- truth. Balances, campaign receipts and project spend are computed
-- from transaction rows by SQL functions. Nobody can type a balance.
--
-- ZAKAT RULE: Zakat lives in its own tables, never mixed with general
-- donations, and recipient identities are never publicly exposed.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Money primitives
-- ------------------------------------------------------------
CREATE TYPE txn_direction AS ENUM ('income', 'expense');

CREATE TYPE txn_approval AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- Amounts are BIGINT paisa (1 BDT = 100 paisa). Never floats — binary
-- floating point cannot represent decimal currency exactly.
CREATE TABLE financial_categories (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  masjid_id UUID REFERENCES masjids(id) ON DELETE CASCADE, -- NULL = platform default
  direction txn_direction NOT NULL,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_zakat BOOLEAN NOT NULL DEFAULT false,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_fc_scope_slug
  ON financial_categories (COALESCE(masjid_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
CREATE INDEX idx_fc_masjid ON financial_categories (masjid_id, direction, sort_order);

INSERT INTO financial_categories (masjid_id, direction, name_bn, name_en, slug, is_zakat, sort_order) VALUES
  (NULL,'income','সাধারণ দান','General donations','general-donation',false,1),
  (NULL,'income','জুমার দান','Jumuah donations','jumuah-donation',false,2),
  (NULL,'income','যাকাত','Zakat','zakat',true,3),
  (NULL,'income','সাদাকাহ','Sadaqah','sadaqah',false,4),
  (NULL,'income','ফিতরা','Fitrah','fitrah',false,5),
  (NULL,'income','সরকারি অনুদান','Government grants','government-grant',false,6),
  (NULL,'income','প্রকল্প দান','Project donations','project-donation',false,7),
  (NULL,'income','অন্যান্য আয়','Other income','other-income',false,8),
  (NULL,'expense','ইমাম বেতন','Imam salary','imam-salary',false,1),
  (NULL,'expense','মুয়াজ্জিন বেতন','Muazzin salary','muazzin-salary',false,2),
  (NULL,'expense','কর্মচারী','Staff','staff',false,3),
  (NULL,'expense','বিদ্যুৎ','Electricity','electricity',false,4),
  (NULL,'expense','গ্যাস','Gas','gas',false,5),
  (NULL,'expense','পানি','Water','water',false,6),
  (NULL,'expense','পরিচ্ছন্নতা','Cleaning','cleaning',false,7),
  (NULL,'expense','রক্ষণাবেক্ষণ','Maintenance','maintenance',false,8),
  (NULL,'expense','নির্মাণ','Construction','construction',false,9),
  (NULL,'expense','শিক্ষা','Education','education',false,10),
  (NULL,'expense','দান/সহায়তা','Charity','charity',false,11),
  (NULL,'expense','অনুষ্ঠান','Events','events',false,12),
  (NULL,'expense','অন্যান্য ব্যয়','Other expenses','other-expense',false,13);

-- ------------------------------------------------------------
-- 2. Financial transactions
-- ------------------------------------------------------------
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  direction txn_direction NOT NULL,
  category_id SMALLINT REFERENCES financial_categories(id) ON DELETE SET NULL,

  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  occurred_on DATE NOT NULL,
  description_bn TEXT,
  reference TEXT,
  receipt_path TEXT,          -- private storage path

  approval txn_approval NOT NULL DEFAULT 'draft',
  is_published BOOLEAN NOT NULL DEFAULT false,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only approved rows may be published; stops an unreviewed figure
  -- appearing on the public transparency page.
  CONSTRAINT published_requires_approval
    CHECK (NOT is_published OR approval = 'approved')
);

CREATE INDEX idx_ft_masjid_date ON financial_transactions (masjid_id, occurred_on DESC);
CREATE INDEX idx_ft_masjid_dir ON financial_transactions (masjid_id, direction, occurred_on DESC);
CREATE INDEX idx_ft_category ON financial_transactions (category_id);
CREATE INDEX idx_ft_public
  ON financial_transactions (masjid_id, occurred_on DESC)
  WHERE is_published AND approval = 'approved';
CREATE TRIGGER trg_ft_updated_at BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 3. Zakat — separate ledger, aggregate-only public reporting
-- ------------------------------------------------------------
CREATE TYPE zakat_category AS ENUM (
  'poor_needy', 'students', 'emergency', 'debt_relief', 'travellers', 'other'
);

CREATE TABLE zakat_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  received_on DATE NOT NULL,
  description_bn TEXT,
  reference TEXT,
  receipt_path TEXT,
  approval txn_approval NOT NULL DEFAULT 'draft',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT zakat_published_requires_approval
    CHECK (NOT is_published OR approval = 'approved')
);

CREATE INDEX idx_zt_masjid_date ON zakat_transactions (masjid_id, received_on DESC);
CREATE TRIGGER trg_zt_updated_at BEFORE UPDATE ON zakat_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE zakat_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  category zakat_category NOT NULL,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  beneficiary_count INT NOT NULL DEFAULT 1 CHECK (beneficiary_count > 0),
  distributed_on DATE NOT NULL,

  -- Public-safe: describes the CATEGORY of help, never who received it.
  description_bn TEXT,

  -- PRIVACY: recipient identity is confidential. These columns are readable
  -- only by the mosque's finance team via RLS, are excluded from every public
  -- view and function below, and must never be surfaced on a public page.
  private_recipient_note TEXT,
  supporting_document_path TEXT,

  approval txn_approval NOT NULL DEFAULT 'draft',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT zdist_published_requires_approval
    CHECK (NOT is_published OR approval = 'approved')
);

CREATE INDEX idx_zd_masjid_date ON zakat_distributions (masjid_id, distributed_on DESC);
CREATE INDEX idx_zd_category ON zakat_distributions (masjid_id, category);
CREATE TRIGGER trg_zd_updated_at BEFORE UPDATE ON zakat_distributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 4. Donation campaigns
-- ------------------------------------------------------------
CREATE TYPE campaign_status AS ENUM
  ('draft', 'active', 'paused', 'completed', 'cancelled', 'archived');

CREATE TABLE donation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  description_bn TEXT,
  target_paisa BIGINT NOT NULL CHECK (target_paisa > 0),
  -- NOTE: no `received_paisa` column by design. Receipts are summed from
  -- the donations table by campaign_totals().
  start_date DATE,
  end_date DATE,
  status campaign_status NOT NULL DEFAULT 'draft',
  cover_image_path TEXT,
  completion_report_bn TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dc_masjid ON donation_campaigns (masjid_id, status);
CREATE INDEX idx_dc_public ON donation_campaigns (masjid_id, start_date DESC)
  WHERE status IN ('active', 'completed');
CREATE TRIGGER trg_dc_updated_at BEFORE UPDATE ON donation_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES donation_campaigns(id) ON DELETE SET NULL,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  received_on DATE NOT NULL,

  -- PRIVACY: donor identity is private by default.
  private_donor_name TEXT,
  private_donor_contact TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,

  reference TEXT,
  receipt_path TEXT,
  approval txn_approval NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_don_masjid ON donations (masjid_id, received_on DESC);
CREATE INDEX idx_don_campaign ON donations (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE TRIGGER trg_don_updated_at BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- 5. Projects
-- ------------------------------------------------------------
CREATE TYPE project_status AS ENUM
  ('planned', 'active', 'paused', 'completed', 'cancelled');

CREATE TABLE mosque_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES donation_campaigns(id) ON DELETE SET NULL,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  description_bn TEXT,
  estimated_budget_paisa BIGINT CHECK (estimated_budget_paisa IS NULL OR estimated_budget_paisa >= 0),
  -- No stored `spent` or `raised`: both derive from project_expenses and donations.
  progress_percent SMALLINT NOT NULL DEFAULT 0
    CHECK (progress_percent BETWEEN 0 AND 100),
  start_date DATE,
  expected_completion DATE,
  actual_completion DATE,
  vendor_name TEXT,
  status project_status NOT NULL DEFAULT 'planned',
  completion_report_bn TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mp_masjid ON mosque_projects (masjid_id, status);
CREATE INDEX idx_mp_public ON mosque_projects (masjid_id, start_date DESC) WHERE is_published;
CREATE TRIGGER trg_mp_updated_at BEFORE UPDATE ON mosque_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES mosque_projects(id) ON DELETE CASCADE,
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  spent_on DATE NOT NULL,
  description_bn TEXT,
  invoice_path TEXT,
  approval txn_approval NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pe_project ON project_expenses (project_id, spent_on DESC);
CREATE INDEX idx_pe_masjid ON project_expenses (masjid_id);

CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES mosque_projects(id) ON DELETE CASCADE,
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  note_bn TEXT NOT NULL,
  photo_path TEXT,
  progress_percent SMALLINT CHECK (progress_percent BETWEEN 0 AND 100),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pu_project ON project_updates (project_id, created_at DESC);

-- ------------------------------------------------------------
-- 6. Documents
-- ------------------------------------------------------------
CREATE TYPE document_type AS ENUM (
  'monthly_financial', 'annual_financial', 'audit', 'donation_report',
  'zakat_report', 'construction_invoice', 'utility_bill', 'grant',
  'project_completion', 'committee_resolution', 'other'
);

CREATE TABLE mosque_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masjid_id UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  doc_type document_type NOT NULL DEFAULT 'other',
  description_bn TEXT,
  file_path TEXT NOT NULL,     -- storage key; private unless is_public
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  period_start DATE,
  period_end DATE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  verification_status moderation_status NOT NULL DEFAULT 'pending',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_md_masjid ON mosque_documents (masjid_id, created_at DESC);
CREATE INDEX idx_md_public ON mosque_documents (masjid_id, doc_type) WHERE is_public;
CREATE TRIGGER trg_md_updated_at BEFORE UPDATE ON mosque_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. DERIVED TOTALS — the only authoritative figures
-- ============================================================

-- Public financial summary. Counts ONLY approved + published rows, so an
-- unreviewed draft can never move a public number.
CREATE OR REPLACE FUNCTION mosque_financial_summary(
  p_masjid_id UUID,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
)
RETURNS TABLE (income_paisa BIGINT, expense_paisa BIGINT, net_paisa BIGINT, txn_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT
    COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'income'), 0)::BIGINT,
    COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'expense'), 0)::BIGINT,
    (COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'income'), 0)
     - COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'expense'), 0))::BIGINT,
    COUNT(*)::BIGINT
  FROM public.financial_transactions
  WHERE masjid_id = p_masjid_id
    AND is_published AND approval = 'approved'
    AND (p_from IS NULL OR occurred_on >= p_from)
    AND (p_to   IS NULL OR occurred_on <= p_to);
$$;

-- Monthly breakdown for the public transparency page.
CREATE OR REPLACE FUNCTION mosque_monthly_financials(p_masjid_id UUID, p_months INT DEFAULT 12)
RETURNS TABLE (month DATE, income_paisa BIGINT, expense_paisa BIGINT, net_paisa BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT
    date_trunc('month', occurred_on)::DATE AS month,
    COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'income'), 0)::BIGINT,
    COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'expense'), 0)::BIGINT,
    (COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'income'), 0)
     - COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'expense'), 0))::BIGINT
  FROM public.financial_transactions
  WHERE masjid_id = p_masjid_id
    AND is_published AND approval = 'approved'
    AND occurred_on >= (date_trunc('month', CURRENT_DATE) - make_interval(months => p_months - 1))::DATE
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

-- Zakat summary. Returns aggregates ONLY — no recipient columns are
-- selected here, so the public page physically cannot render identities.
CREATE OR REPLACE FUNCTION mosque_zakat_summary(p_masjid_id UUID)
RETURNS TABLE (
  received_paisa BIGINT,
  distributed_paisa BIGINT,
  balance_paisa BIGINT,
  total_beneficiaries BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT
    COALESCE((SELECT SUM(amount_paisa) FROM public.zakat_transactions
              WHERE masjid_id = p_masjid_id AND is_published AND approval = 'approved'), 0)::BIGINT,
    COALESCE((SELECT SUM(amount_paisa) FROM public.zakat_distributions
              WHERE masjid_id = p_masjid_id AND is_published AND approval = 'approved'), 0)::BIGINT,
    (COALESCE((SELECT SUM(amount_paisa) FROM public.zakat_transactions
               WHERE masjid_id = p_masjid_id AND is_published AND approval = 'approved'), 0)
     - COALESCE((SELECT SUM(amount_paisa) FROM public.zakat_distributions
                 WHERE masjid_id = p_masjid_id AND is_published AND approval = 'approved'), 0))::BIGINT,
    COALESCE((SELECT SUM(beneficiary_count) FROM public.zakat_distributions
              WHERE masjid_id = p_masjid_id AND is_published AND approval = 'approved'), 0)::BIGINT;
$$;

-- "37 families assisted, 12 students assisted" — counts only, no identities.
CREATE OR REPLACE FUNCTION mosque_zakat_by_category(p_masjid_id UUID)
RETURNS TABLE (category zakat_category, amount_paisa BIGINT, beneficiaries BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT category,
         SUM(amount_paisa)::BIGINT,
         SUM(beneficiary_count)::BIGINT
  FROM public.zakat_distributions
  WHERE masjid_id = p_masjid_id AND is_published AND approval = 'approved'
  GROUP BY category
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION campaign_totals(p_campaign_id UUID)
RETURNS TABLE (target_paisa BIGINT, received_paisa BIGINT, remaining_paisa BIGINT, progress_percent INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH c AS (SELECT target_paisa FROM public.donation_campaigns WHERE id = p_campaign_id),
       d AS (SELECT COALESCE(SUM(amount_paisa), 0) AS got FROM public.donations
             WHERE campaign_id = p_campaign_id AND approval = 'approved')
  SELECT c.target_paisa,
         d.got::BIGINT,
         GREATEST(c.target_paisa - d.got, 0)::BIGINT,
         LEAST(100, FLOOR(d.got * 100.0 / NULLIF(c.target_paisa, 0)))::INT
  FROM c CROSS JOIN d;
$$;

CREATE OR REPLACE FUNCTION project_totals(p_project_id UUID)
RETURNS TABLE (budget_paisa BIGINT, spent_paisa BIGINT, remaining_paisa BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH p AS (SELECT COALESCE(estimated_budget_paisa, 0) AS budget FROM public.mosque_projects WHERE id = p_project_id),
       e AS (SELECT COALESCE(SUM(amount_paisa), 0) AS spent FROM public.project_expenses
             WHERE project_id = p_project_id AND approval = 'approved')
  SELECT p.budget::BIGINT, e.spent::BIGINT, (p.budget - e.spent)::BIGINT
  FROM p CROSS JOIN e;
$$;

-- ============================================================
-- 8. TRANSPARENCY SCORE — every point explainable
-- ============================================================
-- Measures ONLY completeness and public accountability of published
-- information. Not religious quality, popularity, or wealth.
CREATE OR REPLACE FUNCTION mosque_transparency_score(p_masjid_id UUID)
RETURNS TABLE (factor TEXT, label_bn TEXT, points INT, max_points INT, earned BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH m AS (SELECT * FROM public.masjids WHERE id = p_masjid_id)
  SELECT
    t.factor::TEXT,
    t.label_bn::TEXT,
    (CASE WHEN COALESCE(t.earned_flag, false) THEN t.max_points ELSE 0 END)::INT,
    t.max_points::INT,
    COALESCE(t.earned_flag, false)
  FROM (VALUES
    ('identity_verified', 'মসজিদের পরিচয় যাচাইকৃত', 15,
     (SELECT verification_status = 'verified' FROM m)),
    ('location_verified', 'অবস্থান নিশ্চিত', 10,
     (SELECT latitude IS NOT NULL AND longitude IS NOT NULL FROM m)),
    ('committee_published', 'ব্যবস্থাপনা কমিটি প্রকাশিত', 10,
     EXISTS (SELECT 1 FROM public.mosque_committee_members WHERE masjid_id = p_masjid_id AND is_active)),
    ('imam_published', 'ইমামের তথ্য প্রকাশিত', 10,
     EXISTS (SELECT 1 FROM public.mosque_staff WHERE masjid_id = p_masjid_id AND is_active AND position IN ('imam','assistant_imam'))),
    ('prayer_times_current', 'নামাজের সময়সূচি হালনাগাদ', 10,
     EXISTS (SELECT 1 FROM public.prayer_times WHERE masjid_id = p_masjid_id AND kind = 'daily'
             AND updated_at > now() - INTERVAL '90 days')),
    ('financials_published', 'আর্থিক প্রতিবেদন প্রকাশিত', 15,
     EXISTS (SELECT 1 FROM public.financial_transactions WHERE masjid_id = p_masjid_id
             AND is_published AND approval = 'approved' AND occurred_on > CURRENT_DATE - 365)),
    ('zakat_reported', 'যাকাত হিসাব প্রকাশিত', 10,
     EXISTS (SELECT 1 FROM public.zakat_distributions WHERE masjid_id = p_masjid_id
             AND is_published AND approval = 'approved')),
    ('projects_documented', 'প্রকল্পের তথ্য প্রকাশিত', 5,
     EXISTS (SELECT 1 FROM public.mosque_projects WHERE masjid_id = p_masjid_id AND is_published)),
    ('documents_available', 'সর্বজনীন নথি উপলব্ধ', 5,
     EXISTS (SELECT 1 FROM public.mosque_documents WHERE masjid_id = p_masjid_id AND is_public)),
    ('annual_report', 'বার্ষিক প্রতিবেদন প্রকাশিত', 5,
     EXISTS (SELECT 1 FROM public.mosque_documents WHERE masjid_id = p_masjid_id AND is_public
             AND doc_type IN ('annual_financial','audit') AND created_at > now() - INTERVAL '400 days')),
    ('recently_updated', 'সাম্প্রতিক হালনাগাদ', 5,
     (SELECT updated_at > now() - INTERVAL '180 days' FROM m))
  ) AS t(factor, label_bn, max_points, earned_flag);
$$;

CREATE OR REPLACE FUNCTION mosque_transparency_total(p_masjid_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(points), 0)::INT FROM public.mosque_transparency_score(p_masjid_id);
$$;

-- ============================================================
-- 9. RLS
-- ============================================================
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON financial_categories FOR SELECT USING (true);
CREATE POLICY "Team manages own categories" ON financial_categories FOR ALL
  USING (masjid_id IS NOT NULL AND mosque_can(masjid_id, 'manage_finance'))
  WITH CHECK (masjid_id IS NOT NULL AND mosque_can(masjid_id, 'manage_finance'));

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published txns" ON financial_transactions
  FOR SELECT USING (is_published AND approval = 'approved');
CREATE POLICY "Team reads all txns" ON financial_transactions
  FOR SELECT USING (mosque_can(masjid_id, 'manage_finance'));
CREATE POLICY "Team writes txns" ON financial_transactions FOR ALL
  USING (mosque_can(masjid_id, 'manage_finance'))
  WITH CHECK (mosque_can(masjid_id, 'manage_finance'));

ALTER TABLE zakat_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published zakat" ON zakat_transactions
  FOR SELECT USING (is_published AND approval = 'approved');
CREATE POLICY "Team manages zakat" ON zakat_transactions FOR ALL
  USING (mosque_can(masjid_id, 'manage_zakat'))
  WITH CHECK (mosque_can(masjid_id, 'manage_zakat'));

-- Distributions carry recipient notes. There is deliberately NO public
-- SELECT policy: the public page reads aggregates through the SECURITY
-- DEFINER functions above, which never select the private columns.
ALTER TABLE zakat_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages zakat distributions" ON zakat_distributions FOR ALL
  USING (mosque_can(masjid_id, 'manage_zakat'))
  WITH CHECK (mosque_can(masjid_id, 'manage_zakat'));

ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read live campaigns" ON donation_campaigns
  FOR SELECT USING (status IN ('active', 'paused', 'completed'));
CREATE POLICY "Team manages campaigns" ON donation_campaigns FOR ALL
  USING (mosque_can(masjid_id, 'manage_campaigns'))
  WITH CHECK (mosque_can(masjid_id, 'manage_campaigns'));

-- Donations hold donor identity — team-only, no public policy at all.
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages donations" ON donations FOR ALL
  USING (mosque_can(masjid_id, 'manage_campaigns'))
  WITH CHECK (mosque_can(masjid_id, 'manage_campaigns'));

ALTER TABLE mosque_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published projects" ON mosque_projects
  FOR SELECT USING (is_published);
CREATE POLICY "Team manages projects" ON mosque_projects FOR ALL
  USING (mosque_can(masjid_id, 'manage_projects'))
  WITH CHECK (mosque_can(masjid_id, 'manage_projects'));

ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages project expenses" ON project_expenses FOR ALL
  USING (mosque_can(masjid_id, 'manage_projects'))
  WITH CHECK (mosque_can(masjid_id, 'manage_projects'));

ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published updates" ON project_updates
  FOR SELECT USING (is_published);
CREATE POLICY "Team manages project updates" ON project_updates FOR ALL
  USING (mosque_can(masjid_id, 'manage_projects'))
  WITH CHECK (mosque_can(masjid_id, 'manage_projects'));

ALTER TABLE mosque_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read public documents" ON mosque_documents
  FOR SELECT USING (is_public AND verification_status = 'approved');
CREATE POLICY "Team manages documents" ON mosque_documents FOR ALL
  USING (mosque_can(masjid_id, 'manage_documents'))
  WITH CHECK (mosque_can(masjid_id, 'manage_documents'));

COMMENT ON TABLE zakat_distributions IS
  'Zakat outflow. private_recipient_note and supporting_document_path are confidential; public reporting uses mosque_zakat_by_category() aggregates only.';
COMMENT ON FUNCTION mosque_transparency_score(UUID) IS
  'Explainable score: returns one row per factor with points earned. Measures published-information completeness only.';
