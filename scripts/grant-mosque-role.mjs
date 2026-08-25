/**
 * Grants a user an active role at a mosque, without going through the
 * claim → approve flow.
 *
 * Use this for onboarding a mosque's committee directly, or for testing. The
 * in-app path (a person files a claim at /dashboard/claim and a platform admin
 * approves it at /admin/claims) stays the normal route, because it captures who
 * asked, what evidence they gave, and who approved.
 *
 * Usage:
 *   node scripts/grant-mosque-role.mjs --list-mosques [search]
 *   node scripts/grant-mosque-role.mjs --list-members
 *   node scripts/grant-mosque-role.mjs <email> <masjid-slug-or-id> <role> [password]
 *
 * Roles: owner chairman secretary treasurer imam muazzin editor viewer
 */

import { createAdminClient, describeError } from './lib/supabase-admin.mjs';

const db = createAdminClient();
const args = process.argv.slice(2);
const ROLES = ['owner', 'chairman', 'secretary', 'treasurer', 'imam', 'muazzin', 'editor', 'viewer'];

function usage(msg) {
  if (msg) console.error(`\n${msg}\n`);
  console.error('Usage:');
  console.error('  node scripts/grant-mosque-role.mjs --list-mosques [search]');
  console.error('  node scripts/grant-mosque-role.mjs --list-members');
  console.error('  node scripts/grant-mosque-role.mjs <email> <masjid-slug-or-id> <role> [password]');
  console.error(`\nRoles: ${ROLES.join(' ')}`);
  process.exit(1);
}

// ---- listings ----
if (args[0] === '--list-mosques') {
  const term = args[1];
  let q = db.from('masjids').select('id, slug, name_bn, name_en').eq('status', 'published').limit(25);
  if (term) q = q.ilike('name_bn', `%${term}%`);
  const { data, error } = await q;
  if (error) { console.error(describeError(error)); process.exit(1); }
  if (!data.length) { console.log('No mosques matched.'); process.exit(0); }
  for (const m of data) {
    console.log(`${m.id}  ${m.slug.padEnd(46)} ${m.name_bn}`);
  }
  console.log(`\nDashboard URL: /dashboard/mosque/<id>`);
  process.exit(0);
}

if (args[0] === '--list-members') {
  const { data, error } = await db
    .from('mosque_memberships')
    .select('user_id, role, status, masjid:masjids(name_bn, slug)')
    .eq('status', 'active');
  if (error) { console.error(describeError(error)); process.exit(1); }
  if (!data.length) { console.log('No active mosque memberships yet.'); process.exit(0); }

  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emailById = Object.fromEntries((users?.users ?? []).map((u) => [u.id, u.email]));
  for (const m of data) {
    console.log(`${(emailById[m.user_id] ?? m.user_id).padEnd(38)} ${m.role.padEnd(10)} ${m.masjid?.name_bn ?? '—'}`);
  }
  process.exit(0);
}

// ---- grant ----
const [emailArg, mosqueArg, roleArg, passwordArg] = args;
if (!emailArg || !mosqueArg || !roleArg) usage();

const email = emailArg.trim().toLowerCase();
const role = roleArg.trim().toLowerCase();
if (!ROLES.includes(role)) usage(`Unknown role '${role}'.`);

// Resolve the mosque by slug or id.
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mosqueArg);
const { data: masjid, error: mErr } = await db
  .from('masjids')
  .select('id, name_bn, slug')
  .eq(isUuid ? 'id' : 'slug', mosqueArg)
  .maybeSingle();

if (mErr || !masjid) {
  console.error(`No mosque matching '${mosqueArg}'. Try --list-mosques.`);
  process.exit(1);
}

// Find or create the user.
async function findUser(target) {
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(describeError(error));
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page++;
  }
}

let user = await findUser(email);
if (!user) {
  if (!passwordArg) {
    console.error(`No account for ${email}.`);
    console.error(`Pass a password to create it:\n  node scripts/grant-mosque-role.mjs ${email} ${mosqueArg} ${role} 'YourPassw0rd!'`);
    process.exit(1);
  }
  if (passwordArg.length < 8) { console.error('Password must be at least 8 characters.'); process.exit(1); }

  const { data, error } = await db.auth.admin.createUser({
    email, password: passwordArg, email_confirm: true,
  });
  if (error) { console.error(`Create user failed: ${describeError(error)}`); process.exit(1); }
  user = data.user;
  console.log(`Created account ${email}`);
}

const { error: grantError } = await db
  .from('mosque_memberships')
  .upsert(
    {
      masjid_id: masjid.id,
      user_id: user.id,
      role,
      status: 'active',
      granted_at: new Date().toISOString(),
      notes: 'granted via scripts/grant-mosque-role.mjs',
    },
    { onConflict: 'masjid_id,user_id' }
  );

if (grantError) {
  console.error(`Grant failed: ${describeError(grantError)}`);
  process.exit(1);
}

await db.from('audit_logs').insert({
  user_id: user.id,
  action: 'create',
  entity_type: 'mosque_membership',
  entity_id: masjid.id,
  new_data: { role, granted_by: 'cli', email },
});

console.log(`\n✓ ${email} is now ${role} of ${masjid.name_bn}`);
console.log(`  Sign in:   /auth/login`);
console.log(`  Dashboard: /dashboard/mosque/${masjid.id}`);
