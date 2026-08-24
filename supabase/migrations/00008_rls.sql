-- ============================================================
-- MOSJID.INFO — Migration 00008: Row Level Security
-- Comprehensive RLS for all tables
-- ============================================================

-- ============================================================
-- Helper: check if current user is admin/super_admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_moderator_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('moderator', 'admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- GEOGRAPHY TABLES — public read
-- ============================================================
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read divisions" ON divisions FOR SELECT USING (true);
CREATE POLICY "Admin manage divisions" ON divisions FOR ALL USING (is_admin());

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read districts" ON districts FOR SELECT USING (true);
CREATE POLICY "Admin manage districts" ON districts FOR ALL USING (is_admin());

ALTER TABLE upazilas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read upazilas" ON upazilas FOR SELECT USING (true);
CREATE POLICY "Admin manage upazilas" ON upazilas FOR ALL USING (is_admin());

-- ============================================================
-- MASJIDS — public read published, admin write
-- ============================================================
ALTER TABLE masjids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published masjids" ON masjids
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admin read all masjids" ON masjids
  FOR SELECT USING (is_moderator_or_above());

CREATE POLICY "Admin insert masjids" ON masjids
  FOR INSERT WITH CHECK (is_moderator_or_above());

CREATE POLICY "Admin update masjids" ON masjids
  FOR UPDATE USING (is_moderator_or_above());

CREATE POLICY "Admin delete masjids" ON masjids
  FOR DELETE USING (is_admin());

-- ============================================================
-- MASJID IMAGES
-- ============================================================
ALTER TABLE masjid_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved images" ON masjid_images
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Moderator read all images" ON masjid_images
  FOR SELECT USING (is_moderator_or_above());

CREATE POLICY "Auth users upload images" ON masjid_images
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Moderator manage images" ON masjid_images
  FOR ALL USING (is_moderator_or_above());

-- ============================================================
-- MASJID CONTACTS
-- ============================================================
ALTER TABLE masjid_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read contacts" ON masjid_contacts
  FOR SELECT USING (true);

CREATE POLICY "Moderator manage contacts" ON masjid_contacts
  FOR ALL USING (is_moderator_or_above());

-- ============================================================
-- MASJID RATINGS
-- ============================================================
ALTER TABLE masjid_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved ratings" ON masjid_ratings
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Auth users submit rating" ON masjid_ratings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users read own ratings" ON masjid_ratings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Moderator manage ratings" ON masjid_ratings
  FOR ALL USING (is_moderator_or_above());

-- ============================================================
-- MASJID VERIFICATIONS
-- ============================================================
ALTER TABLE masjid_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read verifications" ON masjid_verifications
  FOR SELECT USING (true);

CREATE POLICY "Moderator manage verifications" ON masjid_verifications
  FOR ALL USING (is_moderator_or_above());

-- ============================================================
-- MASJID SUBMISSIONS — public insert, admin read/manage
-- ============================================================
ALTER TABLE masjid_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit" ON masjid_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Moderator read submissions" ON masjid_submissions
  FOR SELECT USING (is_moderator_or_above());

CREATE POLICY "Moderator update submissions" ON masjid_submissions
  FOR UPDATE USING (is_moderator_or_above());

-- ============================================================
-- CORRECTION REQUESTS
-- ============================================================
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit corrections" ON correction_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Moderator manage corrections" ON correction_requests
  FOR SELECT USING (is_moderator_or_above());

CREATE POLICY "Moderator update corrections" ON correction_requests
  FOR UPDATE USING (is_moderator_or_above());

-- ============================================================
-- CHANGE HISTORY
-- ============================================================
ALTER TABLE masjid_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read history" ON masjid_change_history
  FOR SELECT USING (is_moderator_or_above());

CREATE POLICY "System insert history" ON masjid_change_history
  FOR INSERT WITH CHECK (is_moderator_or_above());

-- ============================================================
-- CONTENT TABLES — public read published, admin manage
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON categories FOR ALL USING (is_admin());

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published notices" ON notices FOR SELECT USING (status = 'published');
CREATE POLICY "Admin read all notices" ON notices FOR SELECT USING (is_moderator_or_above());
CREATE POLICY "Admin manage notices" ON notices FOR ALL USING (is_moderator_or_above());

ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published news" ON news_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admin read all news" ON news_posts FOR SELECT USING (is_moderator_or_above());
CREATE POLICY "Admin manage news" ON news_posts FOR ALL USING (is_moderator_or_above());

ALTER TABLE islamic_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published topics" ON islamic_topics FOR SELECT USING (status = 'published');
CREATE POLICY "Admin read all topics" ON islamic_topics FOR SELECT USING (is_moderator_or_above());
CREATE POLICY "Admin manage topics" ON islamic_topics FOR ALL USING (is_moderator_or_above());

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published resources" ON resources FOR SELECT USING (status = 'published');
CREATE POLICY "Admin read all resources" ON resources FOR SELECT USING (is_moderator_or_above());
CREATE POLICY "Admin manage resources" ON resources FOR ALL USING (is_moderator_or_above());

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published activities" ON activities FOR SELECT USING (status = 'published');
CREATE POLICY "Admin read all activities" ON activities FOR SELECT USING (is_moderator_or_above());
CREATE POLICY "Admin manage activities" ON activities FOR ALL USING (is_moderator_or_above());

-- ============================================================
-- AUTH / ADMIN TABLES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin read all profiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = 'user'); -- can't self-elevate

CREATE POLICY "Admin manage profiles" ON profiles
  FOR ALL USING (is_admin());

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage imports" ON import_batches FOR ALL USING (is_admin());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit logs" ON audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "System insert audit logs" ON audit_logs FOR INSERT WITH CHECK (is_moderator_or_above());

ALTER TABLE district_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage serials" ON district_serials FOR ALL USING (is_admin());
