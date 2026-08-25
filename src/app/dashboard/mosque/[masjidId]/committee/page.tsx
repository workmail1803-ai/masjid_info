import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  CommitteeForm, CommitteeDelete, Disclosure, type CommitteeValues,
} from '@/features/mosque/EditorForms';

export const metadata: Metadata = { title: 'কমিটি', robots: { index: false, follow: false } };

export default async function CommitteePage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_committee', `/dashboard/mosque/${masjidId}/committee`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_committee_members').select('*').eq('masjid_id', masjidId).order('sort_order');
  if (error) console.error('Committee load failed:', error.message);

  const members = (data ?? []) as unknown as CommitteeValues[];

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ কমিটির সদস্য যুক্ত করুন">
        <CommitteeForm masjidId={masjidId} />
      </Disclosure>

      {members.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কমিটির কোনো সদস্য যুক্ত করা হয়নি।</p>
          <p className="text-sm text-ink-faint mt-1">কমিটি প্রকাশ করলে স্বচ্ছতা স্কোরে ১০ পয়েন্ট যোগ হয়।</p>
        </div>
      ) : (
        members.map((m) => (
          <details key={m.id} className="card p-5">
            <summary className="cursor-pointer select-none">
              <span className="font-semibold text-ink">{m.name_bn}</span>
              <span className="text-xs text-ink-muted ml-2">{m.role_label_bn}</span>
              {!m.is_active && <span className="badge badge-unverified ml-2">নিষ্ক্রিয়</span>}
            </summary>
            <div className="mt-4 pt-4 border-t border-border">
              <CommitteeForm masjidId={masjidId} member={m} />
              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <CommitteeDelete masjidId={masjidId} memberId={m.id} />
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
