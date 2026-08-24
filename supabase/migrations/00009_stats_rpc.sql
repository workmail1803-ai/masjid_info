-- ============================================================
-- get_directory_stats RPC function
-- Returns aggregated statistics for the homepage
-- ============================================================
CREATE OR REPLACE FUNCTION get_directory_stats()
RETURNS TABLE (
  total_masjids    BIGINT,
  verified_masjids BIGINT,
  districts_covered BIGINT,
  upazilas_covered  BIGINT,
  recently_added    BIGINT,
  pending_submissions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    (SELECT COUNT(*) FROM masjids WHERE status = 'published')::BIGINT AS total_masjids,
    (SELECT COUNT(*) FROM masjids WHERE status = 'published' AND verification_status = 'verified')::BIGINT AS verified_masjids,
    (SELECT COUNT(DISTINCT district_id) FROM masjids WHERE status = 'published')::BIGINT AS districts_covered,
    (SELECT COUNT(DISTINCT upazila_id) FROM masjids WHERE status = 'published' AND upazila_id IS NOT NULL)::BIGINT AS upazilas_covered,
    (SELECT COUNT(*) FROM masjids WHERE status = 'published' AND created_at > NOW() - INTERVAL '30 days')::BIGINT AS recently_added,
    (SELECT COUNT(*) FROM masjid_submissions WHERE status = 'pending_review')::BIGINT AS pending_submissions;
$$;
