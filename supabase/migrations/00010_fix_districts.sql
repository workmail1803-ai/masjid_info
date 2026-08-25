-- ============================================================
-- MOSJID.INFO — Migration 00010: Fix duplicate district
-- ============================================================
-- Bangladesh has 64 districts. Seed 00002/seed.sql inserted 65 because
-- 'নওয়াবগঞ্জ / Nawabganj' was added to Rajshahi division alongside
-- 'চাঁপাইনবাবগঞ্জ / Chapainawabganj' — these are the same district
-- (Chapainawabganj was named Nawabganj until 1984). "Nawabganj" as a
-- standalone name is an *upazila* of Dhaka district, not a district.
--
-- Guarded: only removes the row if nothing depends on it, so this is
-- safe to run against a database that already has masjid records.
-- ============================================================

DO $$
DECLARE
  v_id SMALLINT;
  v_masjids INT;
  v_upazilas INT;
BEGIN
  SELECT id INTO v_id FROM districts WHERE slug = 'nawabganj';

  IF v_id IS NULL THEN
    RAISE NOTICE 'District "nawabganj" not present — nothing to do.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_masjids FROM masjids WHERE district_id = v_id;
  SELECT COUNT(*) INTO v_upazilas FROM upazilas WHERE district_id = v_id;

  IF v_masjids > 0 OR v_upazilas > 0 THEN
    RAISE WARNING
      'District "nawabganj" (id=%) still has % masjid(s) and % upazila(s). '
      'Reassign them to "chapainawabganj" before removing this row.',
      v_id, v_masjids, v_upazilas;
    RETURN;
  END IF;

  DELETE FROM district_serials WHERE district_id = v_id;
  DELETE FROM districts WHERE id = v_id;

  RAISE NOTICE 'Removed duplicate district "nawabganj" (id=%).', v_id;
END $$;
