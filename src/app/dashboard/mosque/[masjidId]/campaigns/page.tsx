import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatTaka, toBanglaDigits } from '@/lib/services/mosque.service';
import {
  CampaignForm, CampaignDelete, DonationForm, Disclosure, type CampaignValues,
} from '@/features/mosque/CampaignForms';

export const metadata: Metadata = { title: 'দান কর্মসূচি', robots: { index: false, follow: false } };

export default async function CampaignsPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_campaigns', `/dashboard/mosque/${masjidId}/campaigns`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('donation_campaigns').select('*').eq('masjid_id', masjidId)
    .order('created_at', { ascending: false });
  if (error) console.error('Campaign load failed:', error.message);

  const campaigns = (data ?? []) as unknown as CampaignValues[];

  // Received amounts are derived, never stored — one call per campaign.
  const totals = await Promise.all(
    campaigns.map((c) => supabase.rpc('campaign_totals', { p_campaign_id: c.id }))
  );

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ নতুন দান কর্মসূচি">
        <CampaignForm masjidId={masjidId} />
      </Disclosure>

      <Disclosure summary="+ দান রেকর্ড করুন">
        <DonationForm masjidId={masjidId}
          campaigns={campaigns.map((c) => ({ id: c.id, title_bn: c.title_bn }))} />
      </Disclosure>

      {campaigns.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কোনো দান কর্মসূচি নেই।</p>
          <p className="text-sm text-ink-faint mt-1">
            যেমন: ছাদ সংস্কার তহবিল, নতুন ওজুখানা নির্মাণ।
          </p>
        </div>
      ) : (
        campaigns.map((c, i) => {
          const t = totals[i].data?.[0] ?? {};
          const received = Number(t.received_paisa ?? 0);
          const progress = Number(t.progress_percent ?? 0);
          return (
            <details key={c.id} className="card p-5">
              <summary className="cursor-pointer select-none flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-ink">{c.title_bn}</span>
                <span className="badge badge-pending">{c.status}</span>
                <span className="ml-auto text-xs text-ink-muted">
                  {formatTaka(received)} / {formatTaka(c.target_paisa)} · {toBanglaDigits(progress)}%
                </span>
              </summary>

              <div className="h-2 rounded-full overflow-hidden my-3"
                style={{ background: 'var(--color-surface-alt)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, progress)}%`, background: 'var(--color-accent)' }} />
              </div>

              <div className="pt-3 border-t border-border">
                <CampaignForm masjidId={masjidId} campaign={c} />
                <div className="mt-3 pt-3 border-t border-border flex justify-end">
                  <CampaignDelete masjidId={masjidId} campaignId={c.id} />
                </div>
              </div>
            </details>
          );
        })
      )}
    </div>
  );
}
