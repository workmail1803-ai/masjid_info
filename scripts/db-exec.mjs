/**
 * Runs a .sql file against the linked Supabase project via the Management API.
 *
 * The Supabase CLI's `db push` needs the database password; this path needs only
 * a personal access token, which is what we already have. Reads the token from
 * SUPABASE_ACCESS_TOKEN — never from a file in the repo, and never logged.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/db-exec.mjs supabase/migrations/00011_mosque_rbac.sql
 *   SUPABASE_ACCESS_TOKEN=... node scripts/db-exec.mjs --sql "select count(*) from masjids"
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from './lib/env.mjs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in the environment.');
  process.exit(1);
}

const ref = readFileSync(join(projectRoot, 'supabase/.temp/project-ref'), 'utf8').trim();

const args = process.argv.slice(2);
let query;
let label;

if (args[0] === '--sql') {
  query = args.slice(1).join(' ');
  label = 'inline SQL';
} else if (args[0]) {
  query = readFileSync(join(projectRoot, args[0]), 'utf8');
  label = args[0];
} else {
  console.error('Pass a .sql file path or --sql "<query>".');
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();

if (!res.ok) {
  console.error(`✗ ${label} failed (HTTP ${res.status})`);
  try {
    const parsed = JSON.parse(text);
    console.error(`  ${parsed.message || text}`);
  } catch {
    console.error(`  ${text.slice(0, 2000)}`);
  }
  process.exit(1);
}

console.log(`✓ ${label} applied`);

// Statement results come back as an array; print anything the query selected.
try {
  const rows = JSON.parse(text);
  if (Array.isArray(rows) && rows.length > 0) {
    console.log(JSON.stringify(rows, null, 1).slice(0, 4000));
  }
} catch {
  if (text.trim() && text.trim() !== '[]') console.log(text.slice(0, 2000));
}
