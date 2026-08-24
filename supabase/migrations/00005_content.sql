-- ============================================================
-- MOSJID.INFO — Migration 00005: Content Tables
-- Notices, news, topics, resources, activities, categories
-- ============================================================

-- ============================================================
-- Categories (shared across content types)
-- ============================================================
CREATE TYPE category_type AS ENUM (
  'news', 'topic', 'resource', 'activity'
);

CREATE TABLE categories (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type category_type NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_type ON categories (type);
CREATE INDEX idx_categories_slug ON categories (slug);
CREATE INDEX idx_categories_type_sort ON categories (type, sort_order);

-- ============================================================
-- Notices
-- ============================================================
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  body_bn TEXT,
  body_en TEXT,
  image_path TEXT,
  attachment_path TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status publish_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notices_slug ON notices (slug);
CREATE INDEX idx_notices_status ON notices (status);
CREATE INDEX idx_notices_published ON notices (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_notices_featured ON notices (is_featured, published_at DESC) WHERE status = 'published' AND is_featured = true;

-- ============================================================
-- News Posts
-- ============================================================
CREATE TABLE news_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  excerpt_bn TEXT,
  excerpt_en TEXT,
  content_bn TEXT,
  content_en TEXT,
  cover_image_path TEXT,
  author_name TEXT,
  category_id SMALLINT REFERENCES categories(id) ON DELETE SET NULL,
  related_masjid_id UUID REFERENCES masjids(id) ON DELETE SET NULL,
  related_district_id SMALLINT REFERENCES districts(id) ON DELETE SET NULL,
  status publish_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_np_slug ON news_posts (slug);
CREATE INDEX idx_np_status ON news_posts (status);
CREATE INDEX idx_np_published ON news_posts (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_np_category ON news_posts (category_id);
CREATE INDEX idx_np_masjid ON news_posts (related_masjid_id);
CREATE INDEX idx_np_district ON news_posts (related_district_id);

-- ============================================================
-- Islamic Topics
-- ============================================================
CREATE TABLE islamic_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  content_bn TEXT,
  content_en TEXT,
  cover_image_path TEXT,
  category_id SMALLINT REFERENCES categories(id) ON DELETE SET NULL,
  status publish_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_it_slug ON islamic_topics (slug);
CREATE INDEX idx_it_status ON islamic_topics (status);
CREATE INDEX idx_it_published ON islamic_topics (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_it_category ON islamic_topics (category_id);

-- ============================================================
-- Resources / Materials
-- ============================================================
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  description_bn TEXT,
  description_en TEXT,
  image_path TEXT,
  file_path TEXT,
  file_type VARCHAR(20),
  category_id SMALLINT REFERENCES categories(id) ON DELETE SET NULL,
  status publish_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_res_slug ON resources (slug);
CREATE INDEX idx_res_status ON resources (status);
CREATE INDEX idx_res_published ON resources (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_res_category ON resources (category_id);

-- ============================================================
-- Activities
-- ============================================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  description_bn TEXT,
  description_en TEXT,
  masjid_id UUID REFERENCES masjids(id) ON DELETE SET NULL,
  event_date DATE,
  location_bn TEXT,
  status publish_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_act_slug ON activities (slug);
CREATE INDEX idx_act_status ON activities (status);
CREATE INDEX idx_act_event_date ON activities (event_date DESC);
CREATE INDEX idx_act_masjid ON activities (masjid_id);
CREATE INDEX idx_act_published ON activities (published_at DESC) WHERE status = 'published';

-- ============================================================
-- Updated_at triggers for content tables
-- ============================================================
CREATE TRIGGER trg_notices_updated_at BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_news_updated_at BEFORE UPDATE ON news_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_topics_updated_at BEFORE UPDATE ON islamic_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
