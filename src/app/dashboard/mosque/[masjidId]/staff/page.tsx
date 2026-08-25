import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  StaffForm, StaffDelete, Disclosure, type StaffValues,
} from '@/features/mosque/EditorForms';

export const metadata: Metadata = { title: 'ইমাম ও কর্মী', robots: { index: false, follow: false } };

const POSITION_BN: Record<string, string> = {
  imam: 'ইমাম', assistant_imam: 'সহকারী ইমাম', muazzin: 'মুয়াজ্জিন',
  khadem: 'খাদেম', teacher: 'শিক্ষক', security: 'নিরাপত্তা', other: 'অন্যান্য',
};

export default async function StaffPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_staff', `/dashboard/mosque/${masjidId}/staff`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_staff').select('*').eq('masjid_id', masjidId).order('sort_order');
  if (error) console.error('Staff load failed:', error.message);

  const staff = (data ?? []) as unknown as StaffValues[];

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ নতুন ইমাম / কর্মী যুক্ত করুন">
        <StaffForm masjidId={masjidId} />
      </Disclosure>

      {staff.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">এখনো কেউ যুক্ত করা হয়নি।</p>
          <p className="text-sm text-ink-faint mt-1">
            ইমামের তথ্য যোগ করলে স্বচ্ছতা স্কোরে ১০ পয়েন্ট যোগ হয়।
          </p>
        </div>
      ) : (
        staff.map((s) => (
          <details key={s.id} className="card p-5">
            <summary className="cursor-pointer select-none flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="font-semibold text-ink">{s.name_bn}</span>
                <span className="text-xs text-ink-muted ml-2">
                  {s.position_label_bn || POSITION_BN[s.position] || s.position}
                </span>
                {!s.is_active && <span className="badge badge-unverified ml-2">নিষ্ক্রিয়</span>}
              </span>
            </summary>
            <div className="mt-4 pt-4 border-t border-border">
              <StaffForm masjidId={masjidId} staff={s} />
              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <StaffDelete masjidId={masjidId} staffId={s.id} />
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
