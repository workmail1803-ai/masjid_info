import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ServiceForm, ServiceDelete, Disclosure, type ServiceValues,
} from '@/features/mosque/EditorForms';

export const metadata: Metadata = { title: 'সমাজসেবা', robots: { index: false, follow: false } };

export default async function ServicesPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_services', `/dashboard/mosque/${masjidId}/services`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('community_services').select('*').eq('masjid_id', masjidId).order('sort_order');
  if (error) console.error('Services load failed:', error.message);

  const services = (data ?? []) as unknown as ServiceValues[];

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ নতুন সেবা যুক্ত করুন">
        <ServiceForm masjidId={masjidId} />
      </Disclosure>

      {services.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কোনো সেবা কার্যক্রম যুক্ত করা হয়নি।</p>
          <p className="text-sm text-ink-faint mt-1">
            যেমন: যাকাত সহায়তা, ইফতার বিতরণ, জানাজার ব্যবস্থা, কুরআন শিক্ষা।
          </p>
        </div>
      ) : (
        services.map((s) => (
          <details key={s.id} className="card p-5">
            <summary className="cursor-pointer select-none">
              {s.icon && <span aria-hidden className="mr-1.5">{s.icon}</span>}
              <span className="font-semibold text-ink">{s.title_bn}</span>
              {!s.is_active && <span className="badge badge-unverified ml-2">নিষ্ক্রিয়</span>}
            </summary>
            <div className="mt-4 pt-4 border-t border-border">
              <ServiceForm masjidId={masjidId} service={s} />
              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <ServiceDelete masjidId={masjidId} serviceId={s.id} />
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
