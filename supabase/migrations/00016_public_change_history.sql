-- ============================================================
-- MOSJID.INFO — Migration 00016: Public update history
-- ============================================================
-- The spec calls for a public "what changed and when" timeline on each mosque
-- page. masjid_change_history holds that, but 00008 gave it moderator-only
-- SELECT, so the public timeline always came back empty.
--
-- Opening the table itself would be wrong: old_value/new_value can contain a
-- previous phone number, a corrected address, or a rejected edit. Instead a
-- view exposes only WHAT changed and WHEN — never the values.
-- ============================================================

CREATE OR REPLACE VIEW public_masjid_updates
WITH (security_invoker = false) AS
SELECT
  h.id,
  h.masjid_id,
  h.action,
  h.field_name,
  h.created_at
FROM masjid_change_history h
WHERE h.masjid_id IN (SELECT id FROM masjids WHERE status = 'published')
  -- Only field-level edits are meaningful to a reader; a bare 'delete' with no
  -- field name says nothing useful and invites speculation.
  AND h.field_name IS NOT NULL;

-- security_invoker = false makes the view run as its owner, so it can read the
-- underlying table while the table's own RLS keeps direct access closed. The
-- view therefore becomes the ONLY public path, and it cannot leak values
-- because it does not select them.
GRANT SELECT ON public_masjid_updates TO anon, authenticated;

COMMENT ON VIEW public_masjid_updates IS
  'Public update timeline: which field changed and when, never the old or new value. masjid_change_history itself stays moderator-only.';
