import { createAdminClient } from './lib/supabase-admin.mjs';
import { describeError } from './lib/supabase-admin.mjs';

const db = createAdminClient();

async function count(table) {
  const { count: n, error } = await db.from(table).select('*', { count: 'exact', head: true });
  return error ? `ERROR (${describeError(error)})` : n;
}

const tables = [
  'divisions',
  'districts',
  'upazilas',
  'masjids',
  'masjid_images',
  'masjid_ratings',
  'masjid_submissions',
  'notices',
  'news',
  'topics',
  'resources',
  'activities',
  'profiles',
  'import_batches',
];

console.log('--- row counts ---');
for (const t of tables) {
  console.log(`${t.padEnd(20)} ${await count(t)}`);
}

console.log('\n--- can we run DDL through an rpc? ---');
for (const fn of ['exec_sql', 'exec', 'execute_sql', 'run_sql']) {
  const { error } = await db.rpc(fn, { sql: 'select 1' });
  console.log(`${fn.padEnd(14)} ${error ? describeError(error) : 'AVAILABLE'}`);
}

console.log('\n--- storage buckets ---');
const { data: buckets, error: bucketError } = await db.storage.listBuckets();
console.log(bucketError ? describeError(bucketError) : JSON.stringify(buckets));

console.log('\n--- auth users ---');
const { data: users, error: userError } = await db.auth.admin.listUsers();
console.log(
  userError ? describeError(userError) : users.users.map((u) => `${u.email} (${u.id})`).join('\n') || '(none)'
);
