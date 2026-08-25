import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Minimal `.env.local` reader.
 *
 * These scripts are run with plain `node`, which does not load `.env.local` the way
 * `next dev` does, and we deliberately avoid adding a dotenv dependency for tooling
 * that only ever runs on a developer's machine.
 */
export function loadEnv(file = '.env.local') {
  let raw;
  try {
    raw = readFileSync(join(projectRoot, file), 'utf8');
  } catch {
    throw new Error(`Could not read ${file}. Copy .env.example and fill in your Supabase keys.`);
  }

  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function requireEnv(env, ...keys) {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`Missing required env var(s): ${missing.join(', ')}`);
  }
  return keys.map((k) => env[k]);
}

export { projectRoot };
