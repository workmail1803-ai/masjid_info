-- ============================================================
-- MOSJID.INFO — Migration 00017: Document storage
-- ============================================================
-- Mosque documents include audit reports and utility bills alongside the
-- monthly statements a mosque wants public. The bucket is therefore PRIVATE:
-- nothing is reachable by guessing a URL. The application mints short-lived
-- signed URLs, and only for rows whose is_public flag is set and whose
-- verification_status is approved.
--
-- This is the opposite trade-off from the `submissions` bucket, which is public
-- because everything in it is a photo already destined for a public page.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mosque-documents',
  'mosque-documents',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------
-- Storage RLS
-- ------------------------------------------------------------
-- Objects are keyed '<masjid_id>/<filename>', so the first path segment
-- identifies the owning mosque and can be checked with mosque_can().

DROP POLICY IF EXISTS "Mosque team uploads documents" ON storage.objects;
CREATE POLICY "Mosque team uploads documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mosque-documents'
    AND public.mosque_can((storage.foldername(name))[1]::uuid, 'manage_documents')
  );

DROP POLICY IF EXISTS "Mosque team reads documents" ON storage.objects;
CREATE POLICY "Mosque team reads documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mosque-documents'
    AND public.mosque_can((storage.foldername(name))[1]::uuid, 'manage_documents')
  );

DROP POLICY IF EXISTS "Mosque team deletes documents" ON storage.objects;
CREATE POLICY "Mosque team deletes documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'mosque-documents'
    AND public.mosque_can((storage.foldername(name))[1]::uuid, 'manage_documents')
  );

-- Deliberately NO anon policy. Public readers never touch storage directly;
-- the server mints a signed URL for approved public documents only.

-- ------------------------------------------------------------
-- Campaign cover images reuse the existing public submissions bucket pattern
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mosque-media', 'mosque-media', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Mosque team uploads media" ON storage.objects;
CREATE POLICY "Mosque team uploads media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mosque-media'
    AND public.mosque_can((storage.foldername(name))[1]::uuid, 'manage_campaigns')
  );

DROP POLICY IF EXISTS "Mosque team deletes media" ON storage.objects;
CREATE POLICY "Mosque team deletes media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'mosque-media'
    AND public.mosque_can((storage.foldername(name))[1]::uuid, 'manage_campaigns')
  );

-- Public read on mosque-media is granted by the bucket being public; cover
-- images are shown on the mosque's public page anyway.

COMMENT ON TABLE mosque_documents IS
  'Document metadata. Files live in the private mosque-documents bucket; public rows are served through short-lived signed URLs, never a guessable path.';
