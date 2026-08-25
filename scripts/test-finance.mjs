/**
 * Financial correctness tests (migration 00013).
 *
 * Verifies the accounting rules that matter:
 *  - totals are DERIVED from transactions, never stored
 *  - unapproved / unpublished rows never move a public number
 *  - Zakat is accounted separately from general donations
 *  - Zakat recipient identities are not reachable publicly
 *
 * Seeds into a real mosque, asserts, then removes everything it wrote.
 */

import { createClient } from '@supabase/supabase-js';
import { createAdminClient, describeError } from './lib/supabase-admin.mjs';
import { loadEnv, requireEnv } from './lib/env.mjs';

const env = loadEnv();
const [url, anonKey] = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
const db = createAdminClient();
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  ok ? passed++ : failed++;
};

const TAKA = (paisa) => (paisa / 100).toLocaleString('en-BD');

const { data: masjid, error: mErr } = await db
  .from('masjids').select('id, name_bn').eq('status', 'published').limit(1).single();
if (mErr) { console.error(describeError(mErr)); process.exit(1); }

console.log(`Using masjid: ${masjid.name_bn}\n`);
const M = masjid.id;

// Clean slate for this mosque.
async function wipe() {
  await db.from('project_expenses').delete().eq('masjid_id', M);
  await db.from('project_updates').delete().eq('masjid_id', M);
  await db.from('mosque_projects').delete().eq('masjid_id', M);
  await db.from('donations').delete().eq('masjid_id', M);
  await db.from('donation_campaigns').delete().eq('masjid_id', M);
  await db.from('zakat_distributions').delete().eq('masjid_id', M);
  await db.from('zakat_transactions').delete().eq('masjid_id', M);
  await db.from('financial_transactions').delete().eq('masjid_id', M);
}
await wipe();

const { data: cats } = await db
  .from('financial_categories').select('id, slug, direction').is('masjid_id', null);
const cat = (slug) => cats.find((c) => c.slug === slug)?.id;
const today = new Date().toISOString().split('T')[0];

try {
  // ============================================================
  console.log('1. Financial summary is derived from transactions');
  // ============================================================
  await db.from('financial_transactions').insert([
    // published + approved → must count
    { masjid_id: M, direction: 'income',  category_id: cat('general-donation'), amount_paisa: 32250000, occurred_on: today, approval: 'approved', is_published: true },
    { masjid_id: M, direction: 'expense', category_id: cat('electricity'),      amount_paisa: 16120000, occurred_on: today, approval: 'approved', is_published: true },
    // approved but NOT published → must be invisible publicly
    { masjid_id: M, direction: 'income',  category_id: cat('sadaqah'),          amount_paisa: 99900000, occurred_on: today, approval: 'approved', is_published: false },
    // draft → must be invisible
    { masjid_id: M, direction: 'income',  category_id: cat('sadaqah'),          amount_paisa: 77700000, occurred_on: today, approval: 'draft',    is_published: false },
  ]);

  const { data: sum } = await db.rpc('mosque_financial_summary', { p_masjid_id: M });
  const s = sum[0];
  check('income counts only published+approved', Number(s.income_paisa) === 32250000, `got ৳${TAKA(s.income_paisa)}`);
  check('expenses counted correctly', Number(s.expense_paisa) === 16120000, `got ৳${TAKA(s.expense_paisa)}`);
  check('net = income − expenses', Number(s.net_paisa) === 16130000, `got ৳${TAKA(s.net_paisa)}`);
  check('unpublished + draft rows excluded', Number(s.txn_count) === 2, `counted ${s.txn_count}`);

  // ============================================================
  console.log('\n2. Publishing an unapproved figure is impossible');
  // ============================================================
  {
    const { error } = await db.from('financial_transactions').insert({
      masjid_id: M, direction: 'income', amount_paisa: 100, occurred_on: today,
      approval: 'draft', is_published: true,
    });
    check('CHECK constraint blocks published+unapproved', !!error, 'insert succeeded');
  }
  {
    const { error } = await db.from('financial_transactions').insert({
      masjid_id: M, direction: 'income', amount_paisa: -500, occurred_on: today,
    });
    check('negative amounts rejected', !!error, 'insert succeeded');
  }

  // ============================================================
  console.log('\n3. Zakat is separate from general income');
  // ============================================================
  await db.from('zakat_transactions').insert([
    { masjid_id: M, amount_paisa: 50000000, received_on: today, approval: 'approved', is_published: true },
  ]);
  await db.from('zakat_distributions').insert([
    { masjid_id: M, category: 'poor_needy', amount_paisa: 20000000, beneficiary_count: 37, distributed_on: today, approval: 'approved', is_published: true, private_recipient_note: 'CONFIDENTIAL name list' },
    { masjid_id: M, category: 'students',   amount_paisa: 10000000, beneficiary_count: 12, distributed_on: today, approval: 'approved', is_published: true, private_recipient_note: 'CONFIDENTIAL name list' },
    { masjid_id: M, category: 'emergency',  amount_paisa:  5000000, beneficiary_count:  8, distributed_on: today, approval: 'approved', is_published: true },
  ]);

  const { data: z } = await db.rpc('mosque_zakat_summary', { p_masjid_id: M });
  check('zakat received tracked', Number(z[0].received_paisa) === 50000000, `got ৳${TAKA(z[0].received_paisa)}`);
  check('zakat distributed summed', Number(z[0].distributed_paisa) === 35000000, `got ৳${TAKA(z[0].distributed_paisa)}`);
  check('zakat balance derived', Number(z[0].balance_paisa) === 15000000, `got ৳${TAKA(z[0].balance_paisa)}`);
  check('beneficiaries aggregated (37+12+8=57)', Number(z[0].total_beneficiaries) === 57, `got ${z[0].total_beneficiaries}`);

  const { data: sum2 } = await db.rpc('mosque_financial_summary', { p_masjid_id: M });
  check('zakat does NOT leak into general income',
    Number(sum2[0].income_paisa) === 32250000, `general income became ৳${TAKA(sum2[0].income_paisa)}`);

  const { data: byCat } = await db.rpc('mosque_zakat_by_category', { p_masjid_id: M });
  const poor = byCat.find((r) => r.category === 'poor_needy');
  check('category breakdown reports counts', Number(poor?.beneficiaries) === 37, JSON.stringify(byCat));
  check('breakdown exposes no recipient columns',
    byCat.every((r) => !('private_recipient_note' in r)), JSON.stringify(Object.keys(byCat[0] ?? {})));

  // ============================================================
  console.log('\n4. Zakat recipient privacy (anonymous client)');
  // ============================================================
  {
    const { data, error } = await anon.from('zakat_distributions').select('*');
    check('anon cannot read zakat_distributions rows',
      (data ?? []).length === 0, `returned ${data?.length} rows (err: ${error?.message ?? 'none'})`);
  }
  {
    const { data } = await anon.from('donations').select('*');
    check('anon cannot read donor records', (data ?? []).length === 0, `returned ${data?.length} rows`);
  }
  {
    const { data } = await anon.rpc('mosque_zakat_summary', { p_masjid_id: M });
    check('anon CAN read zakat aggregates', Number(data?.[0]?.distributed_paisa) === 35000000);
  }

  // ============================================================
  console.log('\n5. Campaign totals derived from donations');
  // ============================================================
  const { data: campaign } = await db.from('donation_campaigns').insert({
    masjid_id: M, title_bn: 'ছাদ সংস্কার', slug: `test-campaign-${Date.now().toString(36)}`,
    target_paisa: 80000000, status: 'active',
  }).select('id').single();

  await db.from('donations').insert([
    { masjid_id: M, campaign_id: campaign.id, amount_paisa: 40000000, received_on: today, approval: 'approved' },
    { masjid_id: M, campaign_id: campaign.id, amount_paisa: 24250000, received_on: today, approval: 'approved' },
    { masjid_id: M, campaign_id: campaign.id, amount_paisa: 90000000, received_on: today, approval: 'draft' },
  ]);

  const { data: ct } = await db.rpc('campaign_totals', { p_campaign_id: campaign.id });
  check('received = sum of APPROVED donations only',
    Number(ct[0].received_paisa) === 64250000, `got ৳${TAKA(ct[0].received_paisa)}`);
  check('remaining derived', Number(ct[0].remaining_paisa) === 15750000, `got ৳${TAKA(ct[0].remaining_paisa)}`);
  check('progress percent derived', Number(ct[0].progress_percent) === 80, `got ${ct[0].progress_percent}%`);

  // ============================================================
  console.log('\n6. Project spend derived from expenses');
  // ============================================================
  const { data: project } = await db.from('mosque_projects').insert({
    masjid_id: M, title_bn: 'ওজুখানা নির্মাণ', slug: `test-project-${Date.now().toString(36)}`,
    estimated_budget_paisa: 30000000, status: 'active', is_published: true,
  }).select('id').single();

  await db.from('project_expenses').insert([
    { masjid_id: M, project_id: project.id, amount_paisa: 12000000, spent_on: today, approval: 'approved' },
    { masjid_id: M, project_id: project.id, amount_paisa:  5000000, spent_on: today, approval: 'draft' },
  ]);

  const { data: pt } = await db.rpc('project_totals', { p_project_id: project.id });
  check('spend counts approved expenses only',
    Number(pt[0].spent_paisa) === 12000000, `got ৳${TAKA(pt[0].spent_paisa)}`);
  check('remaining budget derived', Number(pt[0].remaining_paisa) === 18000000, `got ৳${TAKA(pt[0].remaining_paisa)}`);

  // ============================================================
  console.log('\n7. Transparency score is explainable');
  // ============================================================
  const { data: score, error: scoreErr } = await db.rpc('mosque_transparency_score', { p_masjid_id: M });
  check('score returns per-factor breakdown', !scoreErr && (score ?? []).length === 11, scoreErr?.message ?? `${score?.length} factors`);
  check('every factor carries points + max + earned',
    (score ?? []).every((f) => 'points' in f && 'max_points' in f && 'earned' in f));
  check('max possible is 100',
    (score ?? []).reduce((a, f) => a + Number(f.max_points), 0) === 100,
    `sums to ${(score ?? []).reduce((a, f) => a + Number(f.max_points), 0)}`);

  const { data: total } = await db.rpc('mosque_transparency_total', { p_masjid_id: M });
  const manual = (score ?? []).reduce((a, f) => a + Number(f.points), 0);
  check('total equals sum of earned factors', Number(total) === manual, `${total} vs ${manual}`);
  check('financials_published factor earned after publishing',
    score.find((f) => f.factor === 'financials_published')?.earned === true);
  check('zakat_reported factor earned', score.find((f) => f.factor === 'zakat_reported')?.earned === true);

  console.log(`\n  → transparency score for this mosque: ${total}%`);
} catch (err) {
  console.error(`\nFATAL: ${err.message}`);
  failed++;
} finally {
  console.log('\nCleaning up…');
  await wipe();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
