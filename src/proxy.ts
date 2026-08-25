import { updateSession } from '@/lib/supabase/proxy';
import { type NextRequest } from 'next/server';

// Renamed from `middleware` in Next.js 16 — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Refreshes Supabase auth cookies and performs an optimistic redirect for
  // signed-out visitors. This is NOT the authorization boundary — that lives in
  // src/lib/auth/dal.ts, which every protected page and server action calls.
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/auth/:path*',
  ],
};
