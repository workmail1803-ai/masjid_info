import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser, hasPlatformRole } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  mosqueRoleLabels,
  claimStatusLabels,
  type MosqueRole,
  type ClaimStatus,
} from '@/types/mosque-admin';

export const metadata: Metadata = {
  title: 'ড্যাশবোর্ড',
  robots: { index: false, follow: false },
};

interface MembershipRow {
  masjid_id: string;
  role: MosqueRole;
  granted_at: string | null;
  masjid: { slug: string; name_bn: string; name_en: string | null } | null;
}

interface ClaimRow {
  id: string;
  requested_role: MosqueRole;
  status: ClaimStatus;
  created_at: string;
  review_notes: string | null;
  masjid: { slug: string; name_bn: string } | null;
}

export default async function DashboardPage() {
  // The layout already guarantees a user; this is for the platform-admin link.
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();

  // RLS scopes both queries to this user's own rows.
  const [membershipsResult, claimsResult] = await Promise.all([
    supabase
      .from('mosque_memberships')
      .select('masjid_id, role, granted_at, masjid:masjids(slug, name_bn, name_en)')
      .eq('status', 'active')
      .order('granted_at', { ascending: false }),
    supabase
      .from('mosque_admin_claims')
      .select('id, requested_role, status, created_at, review_notes, masjid:masjids(slug, name_bn)')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (membershipsResult.error) {
    console.error('Membership query failed:', membershipsResult.error.message);
  }
  if (claimsResult.error) {
    console.error('Claims query failed:', claimsResult.error.message);
  }

  const memberships = (membershipsResult.data ?? []) as unknown as MembershipRow[];
  const claims = (claimsResult.data ?? []) as unknown as ClaimRow[];
  const openClaims = claims.filter((c) => c.status === 'pending' || c.status === 'under_review');

  return (
    <div className="space-y-8">
      {user && hasPlatformRole(user, 'moderator') && (
        <div className="card card-accent p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink text-sm">প্ল্যাটফর্ম প্রশাসন</p>
            <p className="text-xs text-ink-muted">
              আপনার অ্যাকাউন্টে প্ল্যাটফর্ম পর্যায়ের অনুমতি আছে।
            </p>
          </div>
          <Link href="/admin" className="btn btn-secondary btn-sm shrink-0">
            অ্যাডমিন প্যানেল
          </Link>
        </div>
      )}

      {/* Memberships */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-bold text-ink">আপনার মসজিদসমূহ</h2>
          <Link href="/dashboard/claim" className="btn btn-primary btn-sm">
            + মসজিদের দায়িত্ব দাবি করুন
          </Link>
        </div>

        {memberships.length > 0 ? (
          <div className="space-y-3">
            {memberships.map((m) => (
              <div key={m.masjid_id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink truncate">
                    {m.masjid?.name_bn ?? 'অজানা মসজিদ'}
                  </h3>
                  {m.masjid?.name_en && (
                    <p className="text-xs text-ink-muted truncate" style={{ fontFamily: 'var(--font-latin)' }}>
                      {m.masjid.name_en}
                    </p>
                  )}
                  <span className="badge badge-verified mt-1.5">
                    {mosqueRoleLabels[m.role]}
                  </span>
                </div>
                {m.masjid?.slug && (
                  <Link href={`/masjid/${m.masjid.slug}`} className="btn btn-ghost btn-sm shrink-0">
                    প্রোফাইল দেখুন
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-ink-muted mb-1">আপনি এখনো কোনো মসজিদের দায়িত্বে নেই।</p>
            <p className="text-sm text-ink-faint mb-4">
              {openClaims.length > 0
                ? 'আপনার আবেদন যাচাইয়ের অপেক্ষায় আছে।'
                : 'যে মসজিদের দায়িত্বে আছেন, সেটির জন্য আবেদন করুন।'}
            </p>
            {openClaims.length === 0 && (
              <Link href="/dashboard/claim" className="btn btn-primary btn-sm">
                আবেদন করুন
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Claims */}
      {claims.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink mb-3">আপনার আবেদনসমূহ</h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="text-left p-3">মসজিদ</th>
                    <th className="text-left p-3">পদ</th>
                    <th className="text-left p-3">অবস্থা</th>
                    <th className="text-left p-3">তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {claims.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 text-ink">{c.masjid?.name_bn ?? '—'}</td>
                      <td className="p-3 text-ink-muted">{mosqueRoleLabels[c.requested_role]}</td>
                      <td className="p-3">
                        <span
                          className={`badge ${
                            c.status === 'approved'
                              ? 'badge-verified'
                              : c.status === 'rejected' || c.status === 'withdrawn'
                                ? 'badge-unverified'
                                : 'badge-pending'
                          }`}
                        >
                          {claimStatusLabels[c.status]}
                        </span>
                        {c.review_notes && (
                          <p className="text-xs text-ink-faint mt-1">{c.review_notes}</p>
                        )}
                      </td>
                      <td className="p-3 text-ink-muted text-xs">
                        {new Date(c.created_at).toLocaleDateString('bn-BD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
