-- ============================================================
-- MOSJID.INFO — Migration 00015: Make approved submission photos visible
-- ============================================================
-- Photos carried over from an approved submission were inserted as
-- 'pending'. search_masjids() only picks a thumbnail from images that are
-- is_primary AND status='approved', so approved mosques rendered the empty
-- placeholder instead of the photo their submitter had provided — and the
-- reviewer had already looked at that photo before approving.
--
-- Also repairs masjids.has_image, which drives the "has photo" filter.
-- ============================================================

-- 1. Publish photos that came from an already-approved submission.
UPDATE masjid_images i
SET status = 'approved'
FROM masjids m
WHERE i.masjid_id = m.id
  AND i.status = 'pending'
  AND i.source_type = 'user_submission'
  AND m.source_type = 'public_submission';

-- 2. Guarantee exactly one primary image per mosque. Without a primary the
--    LATERAL join in search_masjids() finds nothing and the card stays blank.
WITH ranked AS (
  SELECT id,
         masjid_id,
         row_number() OVER (PARTITION BY masjid_id ORDER BY sort_order, created_at) AS rn
  FROM masjid_images
  WHERE status = 'approved'
)
UPDATE masjid_images i
SET is_primary = (r.rn = 1)
FROM ranked r
WHERE i.id = r.id
  AND i.is_primary IS DISTINCT FROM (r.rn = 1);

-- 3. Recompute has_image from reality rather than trusting the flag.
UPDATE masjids m
SET has_image = EXISTS (
  SELECT 1 FROM masjid_images i
  WHERE i.masjid_id = m.id AND i.status = 'approved'
)
WHERE m.has_image IS DISTINCT FROM EXISTS (
  SELECT 1 FROM masjid_images i
  WHERE i.masjid_id = m.id AND i.status = 'approved'
);

-- 4. Keep has_image correct from now on instead of relying on callers to set
--    it. Any insert/update/delete of an image re-derives the flag.
CREATE OR REPLACE FUNCTION sync_masjid_has_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_masjid_id UUID := COALESCE(NEW.masjid_id, OLD.masjid_id);
BEGIN
  UPDATE public.masjids m
  SET has_image = EXISTS (
    SELECT 1 FROM public.masjid_images i
    WHERE i.masjid_id = v_masjid_id AND i.status = 'approved'
  )
  WHERE m.id = v_masjid_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_has_image ON masjid_images;
CREATE TRIGGER trg_sync_has_image
  AFTER INSERT OR UPDATE OF status OR DELETE ON masjid_images
  FOR EACH ROW EXECUTE FUNCTION sync_masjid_has_image();

COMMENT ON FUNCTION sync_masjid_has_image() IS
  'Keeps masjids.has_image derived from approved masjid_images rows, so the directory filter cannot drift out of sync.';
