/**
 * Applies supabase/migrations/00010_fix_districts.sql through the REST API.
 *
 * Bangladesh has 64 districts; the original seed inserted 65 because
 * 'নওয়াবগঞ্জ / Nawabganj' was added to Rajshahi alongside 'চাঁপাইনবাবগঞ্জ /
 * Chapainawabganj' — the same district under its pre-1984 name.
 *
 * The migration file is the source of truth for anyone running `supabase db push`;
 * this script exists because it is pure DML and can therefore be applied with the
 * service-role key alone. Idempotent: safe to re-run.
 *
 *   node scripts/fix-districts.mjs
 */
import { createAdminClient, describeError } from './lib/supabase-admin.mjs';

const db = createAdminClient();

const { data: district, error: findError } = await db
  .from('districts')
  .select('id, name_bn, name_en')
  .eq('slug', 'nawabganj')
  .maybeSingle();

if (findError) {
  console.error(`Lookup failed: ${describeError(findError)}`);
  process.exit(1);
}

if (!district) {
  console.log('District "nawabganj" not present — nothing to do.');
} else {
  // district_serials and masjids both reference districts(id) ON DELETE RESTRICT,
  // so refuse rather than cascade if anything real is attached.
  const [{ count: masjidCount }, { count: upazilaCount }] = await Promise.all([
    db.from('masjids').select('*', { count: 'exact', head: true }).eq('district_id', district.id),
    db.from('upazilas').select('*', { count: 'exact', head: true }).eq('district_id', district.id),
  ]);

  if (masjidCount || upazilaCount) {
    console.error(
      `District "nawabganj" (id=${district.id}) still has ${masjidCount} masjid(s) and ` +
        `${upazilaCount} upazila(s). Reassign them to "chapainawabganj" first.`
    );
    process.exit(1);
  }

  const { error: serialError } = await db
    .from('district_serials')
    .delete()
    .eq('district_id', district.id);
  if (serialError) {
    console.error(`Could not delete district_serials row: ${describeError(serialError)}`);
    process.exit(1);
  }

  const { error: deleteError } = await db.from('districts').delete().eq('id', district.id);
  if (deleteError) {
    console.error(`Could not delete district: ${describeError(deleteError)}`);
    process.exit(1);
  }

  console.log(`Removed duplicate district "${district.name_en}" (id=${district.id}).`);
}

const { count: total } = await db.from('districts').select('*', { count: 'exact', head: true });
console.log(`districts now: ${total} (expected 64)`);
process.exit(total === 64 ? 0 : 1);
