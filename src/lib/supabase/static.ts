import { createServerClient } from '@supabase/ssr';

/**
 * Cookie-free Supabase client for **public, read-only** queries.
 *
 * Why this exists:
 * `createServerSupabaseClient()` calls Next.js `cookies()` which forces
 * fully dynamic SSR on every hit, silently ignoring `export const revalidate`.
 *
 * This client uses the same `createServerClient` (so types are identical) but
 * with no-op cookie handlers — no `cookies()` import means Next.js ISR works.
 *
 * ⚠️  NEVER use this for authenticated or write operations — use
 *    `createServerSupabaseClient()` for those.
 */
let _client: ReturnType<typeof createServerClient> | null = null;

export function createStaticSupabaseClient() {
  if (!_client) {
    _client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      },
    );
  }
  return _client;
}
