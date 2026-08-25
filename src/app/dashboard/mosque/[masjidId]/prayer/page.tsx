import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PrayerForm, type PrayerValues } from '@/features/mosque/EditorForms';

export const metadata: Metadata = { title: 'নামাজের সময়', robots: { index: false, follow: false } };

export default async function EditPrayerPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_prayer_times', `/dashboard/mosque/${masjidId}/prayer`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('prayer_times').select('*').eq('masjid_id', masjidId);
  if (error) console.error('Prayer load failed:', error.message);

  const rows = (data ?? []) as unknown as PrayerValues[];
  const byKind = (k: string) => rows.find((r) => r.kind === k);

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-ink-muted">
        সময়সূচি হালনাগাদ রাখলে স্বচ্ছতা স্কোরে ১০ পয়েন্ট যোগ হয়।
      </p>
      <PrayerForm masjidId={masjidId} kind="daily" title="দৈনিক ওয়াক্ত" values={byKind('daily')} />
      <PrayerForm masjidId={masjidId} kind="ramadan" title="রমজান" values={byKind('ramadan')} />
      <PrayerForm masjidId={masjidId} kind="eid" title="ঈদ জামাত" values={byKind('eid')} />
    </div>
  );
}
