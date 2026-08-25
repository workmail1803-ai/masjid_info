import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  EventForm, EventDelete, Disclosure, type EventValues,
} from '@/features/mosque/EditorForms';

export const metadata: Metadata = { title: 'কার্যক্রম', robots: { index: false, follow: false } };

export default async function EventsPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_events', `/dashboard/mosque/${masjidId}/events`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('activities')
    .select('id, title_bn, title_en, description_bn, speaker_bn, event_date, start_time, end_time, location_bn, contact_note_bn, requires_registration, status')
    .eq('masjid_id', masjidId)
    .order('event_date', { ascending: false })
    .limit(100);
  if (error) console.error('Events load failed:', error.message);

  const events = (data ?? []) as unknown as EventValues[];

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ নতুন কার্যক্রম">
        <EventForm masjidId={masjidId} />
      </Disclosure>

      {events.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কোনো কার্যক্রম নেই।</p>
          <p className="text-sm text-ink-faint mt-1">
            যেমন: তাফসির মাহফিল, কুরআন ক্লাস, ইফতার আয়োজন।
          </p>
        </div>
      ) : (
        events.map((e) => (
          <details key={e.id} className="card p-5">
            <summary className="cursor-pointer select-none flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink">{e.title_bn}</span>
              {e.event_date && (
                <span className="text-xs text-ink-muted">
                  {new Date(e.event_date).toLocaleDateString('bn-BD')}
                </span>
              )}
              <span className={`badge ${e.status === 'published' ? 'badge-verified' : 'badge-pending'}`}>
                {e.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}
              </span>
            </summary>
            <div className="mt-4 pt-4 border-t border-border">
              <EventForm masjidId={masjidId} event={e} />
              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <EventDelete masjidId={masjidId} eventId={e.id} />
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
