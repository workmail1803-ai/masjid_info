-- ============================================================
-- MOSJID.INFO — Migration 00006: Auth & Admin Tables
-- Profiles, import batches, audit logs
-- ============================================================

-- ============================================================
-- User roles
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'user', 'moderator', 'admin', 'super_admin'
);

-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles (role);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Import Batches
-- ============================================================
CREATE TYPE import_status AS ENUM (
  'uploading', 'parsing', 'validating', 'previewing',
  'importing', 'completed', 'failed', 'cancelled'
);

CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  invalid_rows INT NOT NULL DEFAULT 0,
  duplicate_rows INT NOT NULL DEFAULT 0,
  inserted_rows INT NOT NULL DEFAULT 0,
  updated_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  status import_status NOT NULL DEFAULT 'uploading',
  error_report_path TEXT,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ib_status ON import_batches (status);
CREATE INDEX idx_ib_imported_by ON import_batches (imported_by);
CREATE INDEX idx_ib_created_at ON import_batches (created_at DESC);

-- ============================================================
-- Audit Logs
-- ============================================================
CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete', 'verify', 'merge',
  'import', 'reject', 'approve', 'login', 'settings_change'
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT,
  previous_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BRIN index for time-series (much smaller footprint than B-tree)
CREATE INDEX idx_al_created_at ON audit_logs USING BRIN (created_at);
CREATE INDEX idx_al_user_id ON audit_logs (user_id);
CREATE INDEX idx_al_action ON audit_logs (action);
CREATE INDEX idx_al_entity ON audit_logs (entity_type, entity_id);
