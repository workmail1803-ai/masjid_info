import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';
import type { MosqueCapability, MosqueRole } from '@/types/mosque-admin';

/**
 * Data Access Layer — the authorization boundary this app referred to but
 * never had.
 *
 * `proxy.ts` performs an *optimistic* check on every request (it only reads a
 * cookie, and it does not run for Server Action POSTs to routes outside its
 * matcher). It is a redirect convenience, not a security boundary. Every page
 * and every server action that touches privileged data must call one of the
 * `require*` helpers below, which verify against the database.
 *
 * `getUser()` is used rather than `getSession()`: it revalidates the JWT with
 * the Supabase auth server instead of trusting a cookie that a client controls.
 */

export interface AuthedUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
}

/**
 * The signed-in user with their platform profile, or null.
 * `cache()` dedupes this across a single render pass.
 */
export const getCurrentUser = cache(async (): Promise<AuthedUser | null> => {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile lookup failed:', profileError.message);
  }

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    // Absent profile means the row has not been created yet; treat as the
    // least-privileged role rather than assuming anything.
    role: (profile?.role as UserRole) ?? 'user',
  };
});

/** Requires any signed-in user. Redirects to login, preserving the destination. */
export async function requireUser(redirectTo?: string): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = redirectTo
      ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}`
      : '/auth/login';
    redirect(target);
  }
  return user;
}

const PLATFORM_RANK: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

/** True when the user holds at least the given platform role. */
export function hasPlatformRole(user: AuthedUser, minimum: UserRole): boolean {
  return PLATFORM_RANK[user.role] >= PLATFORM_RANK[minimum];
}

/**
 * Requires a platform moderator or above (the `/admin` panel).
 * Sends unauthorized users to the login page rather than revealing that the
 * route exists but is forbidden.
 */
export async function requirePlatformRole(
  minimum: UserRole,
  redirectTo?: string
): Promise<AuthedUser> {
  const user = await requireUser(redirectTo);
  if (!hasPlatformRole(user, minimum)) {
    redirect('/auth/forbidden');
  }
  return user;
}

export const requireModerator = (redirectTo?: string) =>
  requirePlatformRole('moderator', redirectTo);

export const requirePlatformAdmin = (redirectTo?: string) =>
  requirePlatformRole('admin', redirectTo);

// ============================================================
// Mosque-scoped authorization
// ============================================================

export interface MosqueMembership {
  masjidId: string;
  role: MosqueRole;
}

/** The user's active mosque memberships (empty when signed out). */
export const getMyMemberships = cache(async (): Promise<MosqueMembership[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_memberships')
    .select('masjid_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('Membership lookup failed:', error.message);
    return [];
  }

  return (data ?? []).map((m) => ({
    masjidId: m.masjid_id as string,
    role: m.role as MosqueRole,
  }));
});

/**
 * Asks the database whether the current user holds a capability at a mosque.
 *
 * This intentionally delegates to the `mosque_can()` SQL function rather than
 * re-implementing the role→capability table in TypeScript. One definition, used
 * by both RLS policies and application code, so the two cannot drift apart.
 */
export async function canAtMosque(
  masjidId: string,
  capability: MosqueCapability
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('mosque_can', {
    p_masjid_id: masjidId,
    p_capability: capability,
  });

  if (error) {
    // Fail closed: a broken permission check must never read as "allowed".
    console.error('Capability check failed:', error.message);
    return false;
  }

  return data === true;
}

/** Throws unless the user holds the capability. For use inside server actions. */
export async function assertMosqueCapability(
  masjidId: string,
  capability: MosqueCapability
): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError('আপনি লগইন করা নেই।', 'unauthenticated');
  }

  const allowed = await canAtMosque(masjidId, capability);
  if (!allowed) {
    throw new AuthorizationError(
      'এই কাজটি করার অনুমতি আপনার নেই।',
      'forbidden'
    );
  }

  return user;
}

/** Page-level variant: redirects instead of throwing. */
export async function requireMosqueCapability(
  masjidId: string,
  capability: MosqueCapability,
  redirectTo?: string
): Promise<AuthedUser> {
  const user = await requireUser(redirectTo);
  const allowed = await canAtMosque(masjidId, capability);
  if (!allowed) {
    redirect('/auth/forbidden');
  }
  return user;
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly kind: 'unauthenticated' | 'forbidden'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
