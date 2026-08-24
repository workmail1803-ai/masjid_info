-- ============================================================
-- MOSJID.INFO — Migration 00007: Search Functions
-- Optimized PostgreSQL search for 300K+ records
-- Minimal RAM: uses indexed trigram + prefix matching
-- ============================================================

-- ============================================================
-- Main search function — returns paginated results
-- Uses GIN trigram index, avoids full table scan
-- ============================================================
CREATE OR REPLACE FUNCTION search_masjids(
  p_query TEXT DEFAULT NULL,
  p_division_id SMALLINT DEFAULT NULL,
  p_district_id SMALLINT DEFAULT NULL,
  p_upazila_id SMALLINT DEFAULT NULL,
  p_structure_type TEXT DEFAULT NULL,
  p_verification TEXT DEFAULT NULL,
  p_has_image BOOLEAN DEFAULT NULL,
  p_has_contact BOOLEAN DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  central_code VARCHAR,
  slug TEXT,
  name_bn TEXT,
  name_en TEXT,
  area_name_bn TEXT,
  district_name_bn TEXT,
  district_name_en TEXT,
  upazila_name_bn TEXT,
  upazila_name_en TEXT,
  structure_type structure_type,
  verification_status verification_status,
  rating_average NUMERIC,
  rating_count INT,
  has_image BOOLEAN,
  thumbnail_path TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  total_count BIGINT
) AS $$
DECLARE
  v_query_lower TEXT;
BEGIN
  v_query_lower := LOWER(TRIM(COALESCE(p_query, '')));

  RETURN QUERY
  WITH filtered AS (
    SELECT
      m.id, m.central_code, m.slug, m.name_bn, m.name_en,
      m.area_name_bn, m.structure_type, m.verification_status,
      m.rating_average, m.rating_count, m.has_image,
      m.latitude, m.longitude, m.district_id, m.upazila_id,
      -- Use similarity for ranking when query exists
      CASE WHEN v_query_lower != ''
        THEN similarity(m.search_text, v_query_lower)
        ELSE 1.0
      END AS sim_score
    FROM masjids m
    WHERE m.status = 'published'
      -- Trigram search (uses GIN index)
      AND (v_query_lower = '' OR m.search_text % v_query_lower OR m.search_text ILIKE '%' || v_query_lower || '%')
      -- Filters (all use B-tree indexes)
      AND (p_division_id IS NULL OR m.division_id = p_division_id)
      AND (p_district_id IS NULL OR m.district_id = p_district_id)
      AND (p_upazila_id IS NULL OR m.upazila_id = p_upazila_id)
      AND (p_structure_type IS NULL OR m.structure_type = p_structure_type::structure_type)
      AND (p_verification IS NULL OR m.verification_status = p_verification::verification_status)
      AND (p_has_image IS NULL OR m.has_image = p_has_image)
      AND (p_has_contact IS NULL OR m.has_contact = p_has_contact)
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM filtered
  )
  SELECT
    f.id, f.central_code, f.slug, f.name_bn, f.name_en, f.area_name_bn,
    d.name_bn AS district_name_bn, d.name_en AS district_name_en,
    u.name_bn AS upazila_name_bn, u.name_en AS upazila_name_en,
    f.structure_type, f.verification_status,
    f.rating_average, f.rating_count, f.has_image,
    mi.thumbnail_path,
    f.latitude, f.longitude,
    c.cnt AS total_count
  FROM filtered f
  CROSS JOIN counted c
  LEFT JOIN districts d ON d.id = f.district_id
  LEFT JOIN upazilas u ON u.id = f.upazila_id
  LEFT JOIN LATERAL (
    SELECT img.thumbnail_path FROM masjid_images img
    WHERE img.masjid_id = f.id AND img.is_primary = true AND img.status = 'approved'
    LIMIT 1
  ) mi ON true
  ORDER BY
    CASE WHEN v_query_lower != '' THEN f.sim_score ELSE NULL END DESC NULLS LAST,
    f.name_bn ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Duplicate detection function
-- Finds potential duplicates by name similarity + proximity
-- ============================================================
CREATE OR REPLACE FUNCTION detect_duplicates(
  p_name_bn TEXT,
  p_name_en TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_district_id SMALLINT DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  central_code VARCHAR,
  name_bn TEXT,
  name_en TEXT,
  district_name_en TEXT,
  similarity_score REAL,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.central_code, m.name_bn, m.name_en,
    d.name_en AS district_name_en,
    GREATEST(
      similarity(LOWER(m.name_bn), LOWER(p_name_bn)),
      CASE WHEN p_name_en IS NOT NULL AND m.name_en IS NOT NULL
        THEN similarity(LOWER(m.name_en), LOWER(p_name_en))
        ELSE 0
      END
    ) AS similarity_score,
    -- Haversine approximation in meters
    CASE WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
         AND m.latitude IS NOT NULL AND m.longitude IS NOT NULL
      THEN 6371000 * acos(
        LEAST(1.0,
          cos(radians(p_latitude)) * cos(radians(m.latitude)) *
          cos(radians(m.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(m.latitude))
        )
      )
      ELSE NULL
    END AS distance_meters
  FROM masjids m
  LEFT JOIN districts d ON d.id = m.district_id
  WHERE (p_exclude_id IS NULL OR m.id != p_exclude_id)
    AND (p_district_id IS NULL OR m.district_id = p_district_id)
    AND (
      similarity(LOWER(m.name_bn), LOWER(p_name_bn)) > 0.3
      OR (p_name_en IS NOT NULL AND m.name_en IS NOT NULL AND similarity(LOWER(m.name_en), LOWER(p_name_en)) > 0.3)
      OR (
        p_latitude IS NOT NULL AND p_longitude IS NOT NULL
        AND m.latitude IS NOT NULL AND m.longitude IS NOT NULL
        AND ABS(m.latitude - p_latitude) < 0.005 -- ~500m latitude
        AND ABS(m.longitude - p_longitude) < 0.005 -- ~500m longitude
      )
    )
  ORDER BY similarity_score DESC, distance_meters ASC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Stats function — cached via Next.js
-- ============================================================
CREATE OR REPLACE FUNCTION get_directory_stats()
RETURNS TABLE (
  total_masjids BIGINT,
  verified_masjids BIGINT,
  districts_covered BIGINT,
  upazilas_covered BIGINT,
  recently_added BIGINT,
  pending_submissions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM masjids WHERE status = 'published'),
    (SELECT COUNT(*) FROM masjids WHERE status = 'published' AND verification_status = 'verified'),
    (SELECT COUNT(DISTINCT district_id) FROM masjids WHERE status = 'published'),
    (SELECT COUNT(DISTINCT upazila_id) FROM masjids WHERE status = 'published' AND upazila_id IS NOT NULL),
    (SELECT COUNT(*) FROM masjids WHERE status = 'published' AND created_at > now() - INTERVAL '30 days'),
    (SELECT COUNT(*) FROM masjid_submissions WHERE status = 'pending_review');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Viewport-based map query (bounded box, for clustering)
-- Returns only id + coords + name for minimal data transfer
-- ============================================================
CREATE OR REPLACE FUNCTION get_masjids_in_bounds(
  p_min_lat DOUBLE PRECISION,
  p_min_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_limit INT DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  name_bn TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  verification_status verification_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name_bn, m.slug, m.latitude, m.longitude, m.verification_status
  FROM masjids m
  WHERE m.status = 'published'
    AND m.latitude BETWEEN p_min_lat AND p_max_lat
    AND m.longitude BETWEEN p_min_lng AND p_max_lng
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
