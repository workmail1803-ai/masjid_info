/**
 * End-to-end test: can a mosque administrator actually reach and use their
 * own mosque?
 *
 * Walks the real path a mosque committee member takes —
 *   register → claim → platform admin approves → read own mosque →
 *   record a transaction → publish it → see it in the public total
 * — using the ANON key with real sessions, so every step passes through RLS
 * exactly as it would in the browser.
 */

import { createClient } from '@supabase/supabase-js';
import { createAdminClient, describeError } from './lib/supabase-admin.mjs';
import { loadEnv, requireEnv } from './lib/env.mjs';

const env = loadEnv();
const [url, anonKey] = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
const db = createAdminClient();

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  ok ? passed++ : failed++;
};

const S = Date.now().toString(36);
const IMAM = { email: `e2e-treasurer-${S}@example.com`, password: 'TestPassword!2026' };
const ADMIN = { email: `e2e-platform-${S}@example.com`, password: 'TestPassword!2026' };
const created = [];
const txnIds = [];

const anon = () => createClient(url, anonKey, { auth: { persistSession: false } });
async function signIn(c) {
  const client = anon();
  const { error } = await client.auth.signInWithPassword(c);
  if (error) throw new Error(`${c.email}: ${error.message}`);
  return client;
}

try {
  // ---- fixtures ----
  for (const c of [IMAM, ADMIN]) {
    const { data, error } = await db.auth.admin.createUser({
      email: c.email, password: c.password, email_confirm: true,
    });
    if (error) throw new Error(describeError(error));
    c.id = data.user.id;
    created.push(data.user.id);
  }
  await db.from('profiles').update({ role: 'admin' }).eq('id', ADMIN.id);

  const { data: masjid } = await db
    .from('masjids').select('id, name_bn, slug').eq('status', 'published').limit(1).single();
  const { data: other } = await db
    .from('masjids').select('id').eq('status', 'published').neq('id', masjid.id).limit(1).single();

  console.log(`Mosque under test: ${masjid.name_bn}\n`);

  const user = await signIn(IMAM);
  const admin = await signIn(ADMIN);

  // ============================================================
  console.log('1. Before approval — no access');
  // ============================================================
  {
    const { data } = await user
      .from('mosque_memberships').select('id').eq('masjid_id', masjid.id);
    check('no membership yet', (data ?? []).length === 0);

    const { data: can } = await user.rpc('mosque_can', {
      p_masjid_id: masjid.id, p_capability: 'manage_finance',
    });
    check('cannot manage finance', can === false, `got ${can}`);

    const { error } = await user.from('financial_transactions').insert({
      masjid_id: masjid.id, direction: 'income', amount_paisa: 100,
      occurred_on: new Date().toISOString().split('T')[0],
    });
    check('transaction insert BLOCKED by RLS', !!error, 'insert succeeded — RLS FAILED');
  }

  // ============================================================
  console.log('\n2. Claim → platform admin approves');
  // ============================================================
  let claimId;
  {
    const { data, error } = await user.from('mosque_admin_claims').insert({
      masjid_id: masjid.id, user_id: IMAM.id, requested_role: 'treasurer',
      full_name: 'E2E Treasurer', position_description: 'automated end-to-end test',
    }).select('id').single();
    claimId = data?.id;
    check('claim filed', !error && !!claimId, error?.message);

    const { error: approveErr } = await admin.rpc('approve_mosque_claim', {
      p_claim_id: claimId, p_notes: 'e2e',
    });
    check('platform admin approved', !approveErr, approveErr?.message);
  }

  // ============================================================
  console.log('\n3. After approval — dashboard access');
  // ============================================================
  {
    // Exactly what the dashboard layout queries.
    const { data: mem } = await user
      .from('mosque_memberships')
      .select('masjid_id, role, masjid:masjids(slug, name_bn)')
      .eq('status', 'active');
    check('mosque appears in their dashboard list', (mem ?? []).length === 1, JSON.stringify(mem));
    check('role is treasurer', mem?.[0]?.role === 'treasurer', mem?.[0]?.role);

    const { data: own } = await user
      .from('masjids').select('id, name_bn').eq('id', masjid.id).maybeSingle();
    check('can open their own mosque record', own?.id === masjid.id);

    const { data: can } = await user.rpc('mosque_can', {
      p_masjid_id: masjid.id, p_capability: 'manage_finance',
    });
    check('can now manage finance', can === true);
  }

  // ============================================================
  console.log('\n4. Recording and publishing a transaction');
  // ============================================================
  const day = new Date().toISOString().split('T')[0];
  {
    const { data, error } = await user.from('financial_transactions').insert({
      masjid_id: masjid.id, direction: 'income', amount_paisa: 500000,
      occurred_on: day, description_bn: 'E2E পরীক্ষা', approval: 'draft', is_published: false,
    }).select('id').single();
    if (data?.id) txnIds.push(data.id);
    check('treasurer can record a transaction', !error && !!data?.id, error?.message);

    const { data: before } = await db.rpc('mosque_financial_summary', { p_masjid_id: masjid.id });
    check('draft is INVISIBLE in the public total',
      Number(before[0].income_paisa) === 0, `public income = ${before[0].income_paisa}`);

    await user.from('financial_transactions')
      .update({ approval: 'approved', is_published: true }).eq('id', data.id);

    const { data: after } = await db.rpc('mosque_financial_summary', { p_masjid_id: masjid.id });
    check('published transaction APPEARS in the public total',
      Number(after[0].income_paisa) === 500000, `public income = ${after[0].income_paisa}`);
  }

  // ============================================================
  console.log('\n5. Boundaries hold');
  // ============================================================
  {
    const { error } = await user.from('financial_transactions').insert({
      masjid_id: other.id, direction: 'income', amount_paisa: 999,
      occurred_on: day,
    });
    check('cannot write finance at a DIFFERENT mosque', !!error, 'insert succeeded — LEAK');
  }
  {
    const { data } = await user.rpc('mosque_can', {
      p_masjid_id: masjid.id, p_capability: 'manage_members',
    });
    check('treasurer cannot manage members', data === false, `got ${data}`);
  }
  {
    const { error } = await user.from('mosque_memberships')
      .update({ role: 'owner' }).eq('masjid_id', masjid.id).eq('user_id', IMAM.id);
    const { data: role } = await db.from('mosque_memberships')
      .select('role').eq('user_id', IMAM.id).single();
    check('cannot self-promote to owner', role?.role === 'treasurer',
      `role is now ${role?.role} (err: ${error?.message ?? 'none'})`);
  }
} catch (err) {
  console.error(`\nFATAL: ${err.message}`);
  failed++;
} finally {
  console.log('\nCleaning up…');
  if (txnIds.length) await db.from('financial_transactions').delete().in('id', txnIds);
  for (const id of created) await db.auth.admin.deleteUser(id).catch(() => {});
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
