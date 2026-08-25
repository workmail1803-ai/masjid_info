import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ClaimReviewRow } from '@/features/admin/ClaimReview';
import {
  mosqueRoleLabels,
  claimStatusLabels,
  type MosqueRole,
  type ClaimStatus,
} from '@/types/mosque-admin';

export const metadata: Metadata = {
  title: 'মসজিদ দাবি পর্যালোচনা',
  robots: { index: false, follow: false },
};

interface AdminClaimRow {
  id: string;
  requested_role: MosqueRole;
  full_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  position_description: string | null;
  evidence_note: string | null;
  status: ClaimStatus;
  review_notes: string | null;
  created_at: string;
  masjid: { slug: string; name_bn: string; district_id: number } | null;
}

export default async function AdminClaimsPage() {
  // Approving a claim grants standing access to a mosque's private data, so
  // this is admin-only — moderators can read but not decide (enforced in SQL).
  await requirePlatformAdmin('/admin/claims');

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_admin_claims')
    .select(`
      id, requested_role, full_name, contact_phone, contact_email,
      position_description, evidence_note, status, review_notes, created_at,
      masjid:masjids(slug, name_bn, district_id)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Claim list failed:', error.message);
  }

  const claims = (data ?? []) as unknown as AdminClaimRow[];
  const open = claims.filter((c) => c.status === 'pending' || c.status === 'under_review');
  const resolved = claims.filter((c) => c.status !== 'pending' && c.status !== 'under_review');

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-1">মসজিদ দাবি পর্যালোচনা</h1>
      <p className="text-sm text-ink-muted mb-6">
        অনুমোদন দিলে আবেদনকারী সেই মসজিদের ব্যবস্থাপনা প্যানেলে প্রবেশাধিকার পাবেন।
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3">
          অপেক্ষমাণ ({open.length})
        </h2>

        {open.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-ink-muted">অপেক্ষমাণ কোনো আবেদন নেই।</p>
          </div>
        ) : (
          <div className="space-y-4">
            {open.map((claim) => (
              <ClaimReviewRow
                key={claim.id}
                claimId={claim.id}
                masjidName={claim.masjid?.name_bn ?? 'অজানা মসজিদ'}
                masjidSlug={claim.masjid?.slug ?? null}
                requestedRole={mosqueRoleLabels[claim.requested_role]}
                fullName={claim.full_name}
                contactPhone={claim.contact_phone}
                contactEmail={claim.contact_email}
                positionDescription={claim.position_description}
                evidenceNote={claim.evidence_note}
                createdAt={claim.created_at}
              />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3">
            নিষ্পত্তিকৃত
          </h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="text-left p-3">মসজিদ</th>
                    <th className="text-left p-3">আবেদনকারী</th>
                    <th className="text-left p-3">পদ</th>
                    <th className="text-left p-3">অবস্থা</th>
                    <th className="text-left p-3">তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resolved.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 text-ink">{c.masjid?.name_bn ?? '—'}</td>
                      <td className="p-3 text-ink-muted">{c.full_name}</td>
                      <td className="p-3 text-ink-muted">{mosqueRoleLabels[c.requested_role]}</td>
                      <td className="p-3">
                        <span
                          className={`badge ${
                            c.status === 'approved' ? 'badge-verified' : 'badge-unverified'
                          }`}
                        >
                          {claimStatusLabels[c.status]}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-ink-muted">
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
