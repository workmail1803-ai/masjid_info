-- ============================================================
-- MOSJID.INFO — Migration 00014: Submission images
-- ============================================================
-- The public submission form uploads photos to the `submissions` storage
-- bucket, but nothing recorded WHERE they went, so reviewers could not see
-- them and approval silently dropped them. This adds the missing link.
-- ============================================================

ALTER TABLE masjid_submissions
  ADD COLUMN IF NOT EXISTS image_paths TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN masjid_submissions.image_paths IS
  'Storage keys in the `submissions` bucket, recorded at upload time so the review page can display them and approval can carry them into masjid_images.';

-- Reviewers need to find submissions that have photos waiting.
CREATE INDEX IF NOT EXISTS idx_ms_has_images
  ON masjid_submissions (created_at DESC)
  WHERE cardinality(image_paths) > 0;

-- ------------------------------------------------------------
-- Backfill: earlier submissions uploaded files but stored no paths.
-- storage.objects holds the truth; recover it so nothing is orphaned.
-- Object names look like '<submission_uuid>/<timestamp>-<n>.<ext>'.
-- ------------------------------------------------------------
UPDATE masjid_submissions s
SET image_paths = recovered.paths
FROM (
  SELECT
    split_part(o.name, '/', 1)::uuid AS submission_id,
    array_agg(o.name ORDER BY o.name) AS paths
  FROM storage.objects o
  WHERE o.bucket_id = 'submissions'
    AND position('/' in o.name) > 0
    -- Only fold in names whose first segment really is a UUID.
    AND split_part(o.name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  GROUP BY 1
) AS recovered
WHERE s.id = recovered.submission_id
  AND cardinality(s.image_paths) = 0;
