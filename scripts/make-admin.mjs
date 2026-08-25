/**
 * Creates or promotes a platform administrator.
 *
 * Platform admin is the only role that can approve mosque claims, so the first
 * one has to be created out-of-band — there is deliberately no way to grant it
 * from inside the app.
 *
 * Usage:
 *   node scripts/make-admin.mjs you@example.com                  # promote existing user
 *   node scripts/make-admin.mjs you@example.com 'YourPassw0rd!'  # create + promote
 *   node scripts/make-admin.mjs --list                           # show current admins
 */

import { createAdminClient, describeError } from './lib/supabase-admin.mjs';

const db = createAdminClient();
const [emailArg, passwordArg] = process.argv.slice(2);

if (!emailArg) {
  console.error('Usage: node scripts/make-admin.mjs <email> [password]');
  console.error('       node scripts/make-admin.mjs --list');
  process.exit(1);
}

async function listAdmins() {
  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'super_admin']);
  if (error) {
    console.error(describeError(error));
    process.exit(1);
  }
  if (!data.length) {
    console.log('No platform administrators exist yet.');
    return;
  }
  const { data: users } = await db.auth.admin.listUsers();
  const emailById = Object.fromEntries((users?.users ?? []).map((u) => [u.id, u.email]));
  console.log('Platform administrators:');
  for (const p of data) {
    console.log(`  ${(emailById[p.id] ?? p.id).padEnd(40)} ${p.role}`);
  }
}

if (emailArg === '--list') {
  await listAdmins();
  process.exit(0);
}

const email = emailArg.trim().toLowerCase();

// Supabase has no direct get-user-by-email, so page through the list.
async function findUserByEmail(target) {
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

let user = await findUserByEmail(email);

if (!user) {
  if (!passwordArg) {
    console.error(`No user with email ${email}.`);
    console.error('Pass a password as the second argument to create the account:');
    console.error(`  node scripts/make-admin.mjs ${email} 'YourPassw0rd!'`);
    process.exit(1);
  }
  if (passwordArg.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: passwordArg,
    email_confirm: true,
  });
  if (error) {
    console.error(`Could not create user: ${describeError(error)}`);
    process.exit(1);
  }
  user = data.user;
  console.log(`Created user ${email}`);
}

// handle_new_user() creates the profile row, but guard against it being absent.
const { data: profile } = await db
  .from('profiles').select('id').eq('id', user.id).maybeSingle();

if (!profile) {
  const { error } = await db.from('profiles').insert({ id: user.id, role: 'admin' });
  if (error) {
    console.error(`Could not create profile: ${describeError(error)}`);
    process.exit(1);
  }
} else {
  const { error } = await db
    .from('profiles').update({ role: 'admin' }).eq('id', user.id);
  if (error) {
    console.error(`Could not promote: ${describeError(error)}`);
    process.exit(1);
  }
}

console.log(`✓ ${email} is now a platform administrator.`);
console.log('  Sign in at /auth/login, then review mosque claims at /admin/claims');
