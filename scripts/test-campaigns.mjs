/**
 * Campaigns, projects and documents — end-to-end through RLS with the anon key.
 *
 * The central claim under test is that no total is writable: a campaign's
 * received amount and a project's spend come only from underlying approved
 * records, and a treasurer cannot type over them.
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
const TRE = { email: `e2e-campaign-${S}@example.com`, password: 'TestPassword!2026' };
const created = [];
const trash = { campaigns: [], projects: [], docs: [] };

const anon = () => createClient(url, anonKey, { auth: { persistSession: false } });
const publicClient = anon();
const day = new Date().toISOString().split('T')[0];

try {
  const { data: u, error: uErr } = await db.auth.admin.createUser({
    email: TRE.email, password: TRE.password, email_confirm: true,
  });
  if (uErr) throw new Error(describeError(uErr));
  TRE.id = u.user.id;
  created.push(u.user.id);

  const { data: masjid } = await db
    .from('masjids').select('id, name_bn').eq('status', 'published').limit(1).single();
  const M = masjid.id;

  await db.from('mosque_memberships').upsert(
    { masjid_id: M, user_id: TRE.id, role: 'treasurer', status: 'active', granted_at: new Date().toISOString() },
    { onConflict: 'masjid_id,user_id' }
  );

  console.log(`Mosque: ${masjid.name_bn}\nRole: treasurer\n`);

  const user = anon();
  const { error: siErr } = await user.auth.signInWithPassword(TRE);
  if (siErr) throw new Error(siErr.message);

  // ============================================================
  console.log('1. Campaign totals are derived, not typed');
  // ============================================================
  let campaignId;
  {
    const { data, error } = await user.from('donation_campaigns').insert({
      masjid_id: M, title_bn: 'পরীক্ষা তহবিল', slug: `e2e-camp-${S}`,
      target_paisa: 80000000, status: 'active',
    }).select('id').single();
    campaignId = data?.id;
    if (campaignId) trash.campaigns.push(campaignId);
    check('treasurer can create a campaign', !error && !!campaignId, error?.message);

    const { data: t0 } = await user.rpc('campaign_totals', { p_campaign_id: campaignId });
    check('new campaign starts at zero received', Number(t0[0].received_paisa) === 0);

    await user.from('donations').insert([
      { masjid_id: M, campaign_id: campaignId, amount_paisa: 40000000, received_on: day, approval: 'approved' },
      { masjid_id: M, campaign_id: campaignId, amount_paisa: 24250000, received_on: day, approval: 'approved' },
      { masjid_id: M, campaign_id: campaignId, amount_paisa: 90000000, received_on: day, approval: 'draft' },
    ]);

    const { data: t1 } = await user.rpc('campaign_totals', { p_campaign_id: campaignId });
    check('received = approved donations only (৳6,42,500)',
      Number(t1[0].received_paisa) === 64250000, `got ${Number(t1[0].received_paisa) / 100}`);
    check('remaining derived (৳1,57,500)', Number(t1[0].remaining_paisa) === 15750000);
    check('progress derived (80%)', Number(t1[0].progress_percent) === 80);

    // The column does not exist, so PostgREST must reject the write outright.
    const { error: forgeErr } = await user
      .from('donation_campaigns').update({ received_paisa: 99999999 }).eq('id', campaignId);
    check('cannot write a received_paisa total', !!forgeErr, 'update succeeded — total is writable');
  }

  // ============================================================
  console.log('2. Donor identity stays private');
  // ============================================================
  {
    await user.from('donations').insert({
      masjid_id: M, campaign_id: campaignId, amount_paisa: 100000,
      received_on: day, approval: 'approved',
      private_donor_name: 'গোপন দাতা', private_donor_contact: '01800000000',
    });
    const { data } = await publicClient.from('donations').select('*').eq('masjid_id', M);
    check('anon cannot read donor records at all', (data ?? []).length === 0, `${data?.length} rows leaked`);

    const { data: camp } = await publicClient
      .from('donation_campaigns').select('title_bn').eq('id', campaignId).maybeSingle();
    check('but the campaign itself is public', camp?.title_bn === 'পরীক্ষা তহবিল');
  }

  // ============================================================
  console.log('\n3. Project spend derived from approved expenses');
  // ============================================================
  let projectId;
  {
    const { data, error } = await user.from('mosque_projects').insert({
      masjid_id: M, title_bn: 'পরীক্ষা প্রকল্প', slug: `e2e-proj-${S}`,
      estimated_budget_paisa: 30000000, status: 'active', is_published: true, progress_percent: 0,
    }).select('id').single();
    projectId = data?.id;
    if (projectId) trash.projects.push(projectId);
    check('treasurer can create a project', !error && !!projectId, error?.message);

    await user.from('project_expenses').insert([
      { masjid_id: M, project_id: projectId, amount_paisa: 12000000, spent_on: day, approval: 'approved' },
      { masjid_id: M, project_id: projectId, amount_paisa: 5000000, spent_on: day, approval: 'draft' },
    ]);

    const { data: t } = await user.rpc('project_totals', { p_project_id: projectId });
    check('spend counts approved expenses only (৳1,20,000)',
      Number(t[0].spent_paisa) === 12000000, `got ${Number(t[0].spent_paisa) / 100}`);
    check('remaining budget derived (৳1,80,000)', Number(t[0].remaining_paisa) === 18000000);

    await user.from('project_updates').insert({
      masjid_id: M, project_id: projectId, note_bn: 'ভিত্তি স্থাপন সম্পন্ন', progress_percent: 35, is_published: true,
    });
    const { data: pub } = await publicClient
      .from('project_updates').select('note_bn').eq('project_id', projectId);
    check('published project update is public', pub?.some((r) => r.note_bn === 'ভিত্তি স্থাপন সম্পন্ন'));

    const { data: expPub } = await publicClient.from('project_expenses').select('*').eq('project_id', projectId);
    check('raw expense rows NOT public', (expPub ?? []).length === 0, `${expPub?.length} rows leaked`);
  }

  // ============================================================
  console.log('\n4. Documents — private by default');
  // ============================================================
  {
    const path = `${M}/e2e-${S}.pdf`;
    const bytes = new Blob([`%PDF-1.4 e2e ${S}`], { type: 'application/pdf' });

    const { error: upErr } = await user.storage
      .from('mosque-documents').upload(path, bytes, { contentType: 'application/pdf' });
    check('team member can upload to the private bucket', !upErr, upErr?.message);

    const { data: doc, error } = await user.from('mosque_documents').insert({
      masjid_id: M, title_bn: 'পরীক্ষা বিল', doc_type: 'utility_bill',
      file_path: path, mime_type: 'application/pdf', file_size_bytes: 20,
      is_public: false, verification_status: 'pending',
    }).select('id').single();
    if (doc?.id) trash.docs.push({ id: doc.id, path });
    check('document row created', !error && !!doc?.id, error?.message);

    const { data: hidden } = await publicClient
      .from('mosque_documents').select('id').eq('masjid_id', M).eq('id', doc.id);
    check('private document NOT listed publicly', (hidden ?? []).length === 0);

    // Bucket is private: an unauthenticated download must fail.
    const { error: dlErr } = await publicClient.storage.from('mosque-documents').download(path);
    check('anon cannot download from the private bucket', !!dlErr, 'download succeeded — bucket is open');

    const { data: signed } = await user.storage
      .from('mosque-documents').createSignedUrl(path, 60);
    check('team can mint a signed URL', !!signed?.signedUrl);

    await user.from('mosque_documents')
      .update({ is_public: true, verification_status: 'approved' }).eq('id', doc.id);
    const { data: shown } = await publicClient
      .from('mosque_documents').select('id').eq('id', doc.id);
    check('published document IS listed publicly', (shown ?? []).length === 1);
  }

  // ============================================================
  console.log('\n5. Transparency reflects the new records');
  // ============================================================
  {
    const { data: score } = await db.rpc('mosque_transparency_score', { p_masjid_id: M });
    check('projects_documented earned', score.find((f) => f.factor === 'projects_documented')?.earned === true);
    check('documents_available earned', score.find((f) => f.factor === 'documents_available')?.earned === true);
  }
} catch (err) {
  console.error(`\nFATAL: ${err.message}`);
  failed++;
} finally {
  console.log('\nCleaning up…');
  for (const d of trash.docs) {
    await db.from('mosque_documents').delete().eq('id', d.id);
    await db.storage.from('mosque-documents').remove([d.path]);
  }
  for (const id of trash.projects) {
    await db.from('project_expenses').delete().eq('project_id', id);
    await db.from('project_updates').delete().eq('project_id', id);
    await db.from('mosque_projects').delete().eq('id', id);
  }
  for (const id of trash.campaigns) {
    await db.from('donations').delete().eq('campaign_id', id);
    await db.from('donation_campaigns').delete().eq('id', id);
  }
  for (const id of created) await db.auth.admin.deleteUser(id).catch(() => {});
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
