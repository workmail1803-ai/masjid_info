import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  AnnouncementForm, AnnouncementDelete, Disclosure, type AnnouncementValues,
} from '@/features/mosque/EditorForms';

export const metadata: Metadata = { title: 'ঘোষণা', robots: { index: false, follow: false } };

export default async function AnnouncementsPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_announcements', `/dashboard/mosque/${masjidId}/announcements`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('notices')
    .select('id, title_bn, title_en, body_bn, is_featured, is_urgent, status, expires_at, published_at')
    .eq('masjid_id', masjidId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) console.error('Announcements load failed:', error.message);

  const notices = (data ?? []) as unknown as AnnouncementValues[];

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ নতুন ঘোষণা">
        <AnnouncementForm masjidId={masjidId} />
      </Disclosure>

      {notices.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কোনো ঘোষণা নেই।</p>
          <p className="text-sm text-ink-faint mt-1">
            যেমন: নামাজের সময় পরিবর্তন, জানাজার ঘোষণা, রমজানের নোটিশ।
          </p>
        </div>
      ) : (
        notices.map((n) => (
          <details key={n.id} className="card p-5">
            <summary className="cursor-pointer select-none flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink">{n.title_bn}</span>
              <span className={`badge ${n.status === 'published' ? 'badge-verified' : 'badge-pending'}`}>
                {n.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}
              </span>
              {n.is_urgent && <span className="badge badge-unverified">জরুরি</span>}
            </summary>
            <div className="mt-4 pt-4 border-t border-border">
              <AnnouncementForm masjidId={masjidId} notice={n} />
              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <AnnouncementDelete masjidId={masjidId} noticeId={n.id} />
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
