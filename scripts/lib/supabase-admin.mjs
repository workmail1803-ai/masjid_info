import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './env.mjs';

/**
 * Service-role Supabase client for local maintenance scripts.
 *
 * Bypasses RLS, so nothing in this folder should ever be imported by application
 * code — these modules exist only to be run by hand from the project root.
 */
export function createAdminClient() {
  const env = loadEnv();
  const [url, serviceKey] = requireEnv(
    env,
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  );

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Formats a Supabase error the way a human reading a terminal wants to see it. */
export function describeError(error) {
  if (!error) return 'unknown error';
  const parts = [error.message];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(error.details);
  if (error.hint) parts.push(`hint: ${error.hint}`);
  return parts.join(' | ');
}
