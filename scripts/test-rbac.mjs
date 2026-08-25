/**
 * Authorization test for the mosque RBAC system (migration 00011).
 *
 * Exercises the database boundary directly with the ANON key and real user
 * sessions — the same surface an attacker reaches by calling PostgREST without
 * going through the Next.js app. Passing here means the guarantees hold even if
 * every frontend check were bypassed.
 *
 * Creates two throwaway users and deletes them at the end.
 *
 * Usage: node scripts/test-rbac.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createAdminClient, describeError } from './lib/supabase-admin.mjs';
import { loadEnv, requireEnv } from './lib/env.mjs';

const env = loadEnv();
const [url, anonKey] = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
const admin = createAdminClient();

const STAMP = Date.now().toString(36);
const ORDINARY = { email: `rbac-test-user-${STAMP}@example.com`, password: 'TestPassword!2026' };
const PLATFORM = { email: `rbac-test-admin-${STAMP}@example.com`, password: 'TestPassword!2026' };

let passed = 0;
let failed = 0;
const created = [];

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function anonClient() {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signedInClient(creds) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword(creds);
  if (error) throw new Error(`sign-in failed for ${creds.email}: ${error.message}`);
  return client;
}

async function main() {
  console.log('Setting up test fixtures…');

  // --- users ---
  for (const creds of [ORDINARY, PLATFORM]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: creds.email,
      password: creds.password,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser: ${describeError(error)}`);
    creds.id = data.user.id;
    created.push(data.user.id);
  }

  // Promote one to platform admin (service role bypasses the no-self-elevation policy).
  const { error: promoteError } = await admin
    .from('profiles').update({ role: 'admin' }).eq('id', PLATFORM.id);
  if (promoteError) throw new Error(`promote: ${describeError(promoteError)}`);

  // --- a mosque to claim ---
  const { data: masjid, error: masjidError } = await admin
    .from('masjids').select('id, name_bn').eq('status', 'published').limit(1).single();
  if (masjidError) throw new Error(`need at least one published masjid: ${describeError(masjidError)}`);
  console.log(`  using masjid: ${masjid.name_bn}\n`);

  const userClient = await signedInClient(ORDINARY);
  const adminClient = await signedInClient(PLATFORM);

  // ============================================================
  console.log('1. Privilege escalation attempts (ordinary user)');
  // ============================================================

  {
    const { error } = await userClient
      .from('profiles').update({ role: 'admin' }).eq('id', ORDINARY.id);
    const { data: after } = await admin
      .from('profiles').select('role').eq('id', ORDINARY.id).single();
    check('cannot self-elevate profiles.role to admin',
      after?.role === 'user', `role is now '${after?.role}' (update error: ${error?.message ?? 'none'})`);
  }

  {
    // Forge an active membership directly via PostgREST.
    const { error } = await userClient.from('mosque_memberships').insert({
      masjid_id: masjid.id, user_id: ORDINARY.id, role: 'treasurer', status: 'active',
    });
    const { count } = await admin
      .from('mosque_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ORDINARY.id);
    check('cannot self-grant a mosque membership',
      count === 0, `${count} membership row(s) exist; insert error: ${error?.message ?? 'NONE — RLS FAILED'}`);
  }

  {
    const { data, error } = await userClient.rpc('mosque_can', {
      p_masjid_id: masjid.id, p_capability: 'manage_finance',
    });
    check('mosque_can() returns false for a non-member',
      data === false, `returned ${JSON.stringify(data)} (error: ${error?.message ?? 'none'})`);
  }

  // ============================================================
  console.log('\n2. Claim workflow');
  // ============================================================

  let claimId;
  {
    const { data, error } = await userClient
      .from('mosque_admin_claims')
      .insert({
        masjid_id: masjid.id,
        user_id: ORDINARY.id,
        requested_role: 'treasurer',
        full_name: 'RBAC Test Claimant',
        position_description: 'automated test',
      })
      .select('id, status')
      .single();
    claimId = data?.id;
    check('signed-in user can file a claim', !error && !!claimId, error?.message);
    check('new claim defaults to pending', data?.status === 'pending', `status=${data?.status}`);
  }

  {
    // Try to file a claim on behalf of someone else.
    const { error } = await userClient.from('mosque_admin_claims').insert({
      masjid_id: masjid.id, user_id: PLATFORM.id,
      requested_role: 'chairman', full_name: 'Impersonation Attempt',
    });
    check('cannot file a claim for another user', !!error, 'insert succeeded — RLS FAILED');
  }

  {
    // The critical test: self-approval.
    const { error } = await userClient.rpc('approve_mosque_claim', {
      p_claim_id: claimId, p_notes: 'self-approval attempt',
    });
    const { data: claim } = await admin
      .from('mosque_admin_claims').select('status').eq('id', claimId).single();
    check('claimant cannot approve their own claim via RPC',
      !!error && claim?.status === 'pending',
      `error=${error?.message ?? 'NONE'} status=${claim?.status}`);
  }

  {
    // Try to flip the claim to approved with a direct UPDATE.
    await userClient
      .from('mosque_admin_claims').update({ status: 'approved' }).eq('id', claimId);
    const { data: claim } = await admin
      .from('mosque_admin_claims').select('status').eq('id', claimId).single();
    check('claimant cannot UPDATE their claim to approved',
      claim?.status === 'pending', `status is now '${claim?.status}'`);
  }

  {
    const { data } = await userClient
      .from('mosque_admin_claims').select('id').eq('id', claimId);
    check('claimant can read their own claim', (data ?? []).length === 1);
  }

  // ============================================================
  console.log('\n3. Platform admin approval');
  // ============================================================

  {
    const { error } = await adminClient.rpc('approve_mosque_claim', {
      p_claim_id: claimId, p_notes: 'approved by automated test',
    });
    check('platform admin can approve', !error, error?.message);

    const { data: claim } = await admin
      .from('mosque_admin_claims').select('status').eq('id', claimId).single();
    check('claim status becomes approved', claim?.status === 'approved', `status=${claim?.status}`);

    const { data: membership } = await admin
      .from('mosque_memberships')
      .select('role, status').eq('user_id', ORDINARY.id).eq('masjid_id', masjid.id).maybeSingle();
    check('approval creates an active membership with the requested role',
      membership?.status === 'active' && membership?.role === 'treasurer',
      JSON.stringify(membership));
  }

  {
    const { data: log } = await admin
      .from('audit_logs')
      .select('action, entity_type, user_id')
      .eq('entity_type', 'mosque_admin_claim')
      .eq('entity_id', claimId)
      .maybeSingle();
    check('approval is written to audit_logs',
      log?.action === 'approve' && log?.user_id === PLATFORM.id, JSON.stringify(log));
  }

  // ============================================================
  console.log('\n4. Capabilities after approval (treasurer)');
  // ============================================================

  {
    const cases = [
      ['manage_finance', true],
      ['manage_zakat', true],
      ['view_dashboard', true],
      ['manage_members', false],   // chairman/owner only
      ['manage_prayer_times', false], // imam/secretary only
    ];
    for (const [capability, expected] of cases) {
      const { data } = await userClient.rpc('mosque_can', {
        p_masjid_id: masjid.id, p_capability: capability,
      });
      check(`treasurer ${expected ? 'CAN' : 'CANNOT'} ${capability}`,
        data === expected, `got ${JSON.stringify(data)}`);
    }
  }

  {
    // A treasurer at mosque A must have no authority at mosque B.
    const { data: other } = await admin
      .from('masjids').select('id').eq('status', 'published').neq('id', masjid.id).limit(1).single();
    if (other) {
      const { data } = await userClient.rpc('mosque_can', {
        p_masjid_id: other.id, p_capability: 'manage_finance',
      });
      check('capability does not leak to a different mosque', data === false, `got ${JSON.stringify(data)}`);
    }
  }

  // ============================================================
  console.log('\n5. Search-path hardening');
  // ============================================================

  {
    const { data } = await admin.rpc('mosque_can', {
      p_masjid_id: masjid.id, p_capability: 'not_a_real_capability',
    });
    // Service role is is_admin()-exempt, so this returns true; the point is it
    // must not throw on an unknown capability string.
    check('unknown capability string is handled without error', data === true || data === false);
  }
}

try {
  await main();
} catch (err) {
  console.error(`\nFATAL: ${err.message}`);
  failed++;
} finally {
  console.log('\nCleaning up test fixtures…');
  for (const id of created) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(`  removed ${created.length} test user(s)`);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
