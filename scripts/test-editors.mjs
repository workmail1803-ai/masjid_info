/**
 * End-to-end test of the mosque self-service editors.
 *
 * A secretary edits every publicly visible part of their mosque, and we check
 * each edit actually surfaces on the public read path — through RLS, with the
 * anon key, the same way a visitor's browser would see it.
 *
 * Also checks the role boundaries: a secretary is not a treasurer.
 */

import { createClient } from '@supabase/supabase-js';
import { createAdminClient, describeError } from './lib/supabase-admin.mjs';
import { loadEnv, requireEnv } from './lib/env.mjs';

const env = loadEnv();
const [url, anonKey] = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
const db = createAdminClient();

let passed = 0, failed = 0;
const check = (n, ok, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${ok || !d ? '' : ` — ${d}`}`);
  ok ? passed++ : failed++;
};

const S = Date.now().toString(36);
const SEC = { email: `e2e-secretary-${S}@example.com`, password: 'TestPassword!2026' };
const created = [];
const cleanup = { staff: [], committee: [], services: [], notices: [], events: [] };

const anon = () => createClient(url, anonKey, { auth: { persistSession: false } });
const publicClient = anon();

try {
  const { data: u, error: uErr } = await db.auth.admin.createUser({
    email: SEC.email, password: SEC.password, email_confirm: true,
  });
  if (uErr) throw new Error(describeError(uErr));
  SEC.id = u.user.id;
  created.push(u.user.id);

  const { data: masjid } = await db
    .from('masjids').select('id, slug, name_bn').eq('status', 'published').limit(1).single();
  const M = masjid.id;

  await db.from('mosque_memberships').upsert(
    { masjid_id: M, user_id: SEC.id, role: 'secretary', status: 'active', granted_at: new Date().toISOString() },
    { onConflict: 'masjid_id,user_id' }
  );

  console.log(`Mosque: ${masjid.name_bn}\nRole: secretary\n`);

  const user = anon();
  const { error: siErr } = await user.auth.signInWithPassword(SEC);
  if (siErr) throw new Error(siErr.message);

  // ============================================================
  console.log('1. Capabilities match the secretary role');
  // ============================================================
  for (const [cap, expected] of [
    ['manage_profile', true], ['manage_committee', true], ['manage_staff', true],
    ['manage_announcements', true], ['manage_events', true], ['manage_services', true],
    ['manage_prayer_times', true],
    ['manage_finance', false], ['manage_zakat', false], ['manage_members', false],
  ]) {
    const { data } = await user.rpc('mosque_can', { p_masjid_id: M, p_capability: cap });
    check(`${expected ? 'CAN' : 'CANNOT'} ${cap}`, data === expected, `got ${data}`);
  }

  // ============================================================
  console.log('\n2. Profile edit reaches the public page');
  // ============================================================
  {
    const marker = `E2E বিবরণ ${S}`;
    const { error } = await user.from('masjids').update({
      description_bn: marker, capacity: 750, has_wudu_facility: true,
      has_women_prayer_area: true, official_phone: '01700000000',
    }).eq('id', M);
    check('secretary can update the profile', !error, error?.message);

    const { data: pub } = await publicClient
      .from('masjids').select('description_bn, capacity, has_wudu_facility').eq('id', M).single();
    check('description visible publicly', pub?.description_bn === marker);
    check('capacity visible publicly', pub?.capacity === 750);
    check('facility flag visible publicly', pub?.has_wudu_facility === true);
  }

  // ============================================================
  console.log('\n3. Prayer times');
  // ============================================================
  {
    const { error } = await user.from('prayer_times').upsert(
      { masjid_id: M, kind: 'daily', fajr: '05:10', dhuhr: '13:15', asr: '16:30', maghrib: '18:05', isha: '19:30', jumuah: '13:15' },
      { onConflict: 'masjid_id,kind' }
    );
    check('secretary can save prayer times', !error, error?.message);

    const { data: pub } = await publicClient
      .from('prayer_times').select('fajr, jumuah').eq('masjid_id', M).eq('kind', 'daily').maybeSingle();
    check('prayer times visible publicly', pub?.fajr === '05:10:00' && pub?.jumuah === '13:15:00', JSON.stringify(pub));

    const { data: score } = await db.rpc('mosque_transparency_score', { p_masjid_id: M });
    check('transparency: prayer_times_current now earned',
      score.find((f) => f.factor === 'prayer_times_current')?.earned === true);
  }

  // ============================================================
  console.log('\n4. Staff — privacy of personal numbers');
  // ============================================================
  {
    const { data, error } = await user.from('mosque_staff').insert({
      masjid_id: M, name_bn: 'মাওলানা পরীক্ষা', position: 'imam',
      qualifications_bn: 'দাওরায়ে হাদিস', private_phone: '01900000000',
      contact_consent_public: false, is_active: true,
    }).select('id').single();
    if (data?.id) cleanup.staff.push(data.id);
    check('secretary can add an imam', !error && !!data?.id, error?.message);

    const { data: view } = await publicClient
      .from('public_mosque_staff').select('name_bn, public_phone').eq('masjid_id', M);
    const row = view?.find((r) => r.name_bn === 'মাওলানা পরীক্ষা');
    check('imam appears on the public page', !!row);
    check('private phone WITHHELD without consent', row?.public_phone === null, `leaked: ${row?.public_phone}`);

    await user.from('mosque_staff').update({ contact_consent_public: true }).eq('id', data.id);
    const { data: view2 } = await publicClient
      .from('public_mosque_staff').select('name_bn, public_phone').eq('masjid_id', M);
    const row2 = view2?.find((r) => r.name_bn === 'মাওলানা পরীক্ষা');
    check('phone shown ONLY after consent', row2?.public_phone === '01900000000', `got ${row2?.public_phone}`);
  }

  // ============================================================
  console.log('\n5. Committee, services, announcement, event');
  // ============================================================
  {
    const { data, error } = await user.from('mosque_committee_members').insert({
      masjid_id: M, name_bn: 'পরীক্ষা সভাপতি', role_label_bn: 'সভাপতি', is_active: true,
    }).select('id').single();
    if (data?.id) cleanup.committee.push(data.id);
    check('committee member added', !error, error?.message);

    const { data: pub } = await publicClient
      .from('mosque_committee_members').select('name_bn').eq('masjid_id', M);
    check('committee visible publicly', pub?.some((r) => r.name_bn === 'পরীক্ষা সভাপতি'));
  }
  {
    const { data, error } = await user.from('community_services').insert({
      masjid_id: M, title_bn: 'পরীক্ষা সেবা', icon: '🤲', is_active: true,
    }).select('id').single();
    if (data?.id) cleanup.services.push(data.id);
    check('service added', !error, error?.message);

    const { data: pub } = await publicClient
      .from('community_services').select('title_bn').eq('masjid_id', M);
    check('service visible publicly', pub?.some((r) => r.title_bn === 'পরীক্ষা সেবা'));
  }
  {
    const slug = `e2e-notice-${S}`;
    const { data, error } = await user.from('notices').insert({
      masjid_id: M, title_bn: 'পরীক্ষা ঘোষণা', slug,
      status: 'draft', is_urgent: true,
    }).select('id').single();
    if (data?.id) cleanup.notices.push(data.id);
    check('announcement created as draft', !error, error?.message);

    const { data: hidden } = await publicClient.from('notices').select('id').eq('slug', slug);
    check('draft announcement NOT public', (hidden ?? []).length === 0, `${hidden?.length} rows visible`);

    await user.from('notices')
      .update({ status: 'published', published_at: new Date().toISOString() }).eq('id', data.id);
    const { data: shown } = await publicClient.from('notices').select('id').eq('slug', slug);
    check('published announcement IS public', (shown ?? []).length === 1);
  }
  {
    const slug = `e2e-event-${S}`;
    const { data, error } = await user.from('activities').insert({
      masjid_id: M, title_bn: 'পরীক্ষা মাহফিল', slug,
      event_date: new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0],
      status: 'published', published_at: new Date().toISOString(),
    }).select('id').single();
    if (data?.id) cleanup.events.push(data.id);
    check('event created', !error, error?.message);

    const { data: pub } = await publicClient.from('activities').select('id').eq('slug', slug);
    check('event visible publicly', (pub ?? []).length === 1);
  }

  // ============================================================
  console.log('\n6. Secretary cannot cross into finance');
  // ============================================================
  {
    const { error } = await user.from('financial_transactions').insert({
      masjid_id: M, direction: 'income', amount_paisa: 1000,
      occurred_on: new Date().toISOString().split('T')[0],
    });
    check('finance write BLOCKED for secretary', !!error, 'insert succeeded — LEAK');
  }
  {
    const { error } = await user.from('zakat_distributions').insert({
      masjid_id: M, category: 'poor_needy', amount_paisa: 1000,
      beneficiary_count: 1, distributed_on: new Date().toISOString().split('T')[0],
    });
    check('zakat write BLOCKED for secretary', !!error, 'insert succeeded — LEAK');
  }

  // ============================================================
  console.log('\n7. Change history recorded for the public timeline');
  // ============================================================
  {
    await db.from('masjid_change_history').insert({
      masjid_id: M, changed_by: SEC.id, action: 'update', field_name: 'profile',
    });
    const { data } = await publicClient
      .from('public_masjid_updates').select('field_name').eq('masjid_id', M).limit(5);
    check('change history readable for the public timeline', (data ?? []).length > 0);
  }
} catch (err) {
  console.error(`\nFATAL: ${err.message}`);
  failed++;
} finally {
  console.log('\nCleaning up…');
  for (const id of cleanup.staff) await db.from('mosque_staff').delete().eq('id', id);
  for (const id of cleanup.committee) await db.from('mosque_committee_members').delete().eq('id', id);
  for (const id of cleanup.services) await db.from('community_services').delete().eq('id', id);
  for (const id of cleanup.notices) await db.from('notices').delete().eq('id', id);
  for (const id of cleanup.events) await db.from('activities').delete().eq('id', id);
  for (const id of created) await db.auth.admin.deleteUser(id).catch(() => {});
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
