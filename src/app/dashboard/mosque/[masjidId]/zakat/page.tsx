import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getZakatSummary, formatTaka, toBanglaDigits } from '@/lib/services/mosque.service';
import {
  ZakatReceiveForm, ZakatDistributeForm, ZakatPublishButton,
} from '@/features/mosque/FinanceForms';

export const metadata: Metadata = {
  title: 'যাকাত',
  robots: { index: false, follow: false },
};

const ZAKAT_LABELS: Record<string, string> = {
  poor_needy: 'দরিদ্র ও অসহায়',
  students: 'শিক্ষার্থী',
  emergency: 'জরুরি সহায়তা',
  debt_relief: 'ঋণগ্রস্ত',
  travellers: 'মুসাফির',
  other: 'অন্যান্য',
};

interface ReceivedRow {
  id: string; amount_paisa: number; received_on: string;
  description_bn: string | null; is_published: boolean;
}
interface DistRow {
  id: string; category: string; amount_paisa: number; beneficiary_count: number;
  distributed_on: string; description_bn: string | null;
  private_recipient_note: string | null; is_published: boolean;
}

export default async function ZakatPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_zakat', `/dashboard/mosque/${masjidId}/zakat`);

  const supabase = await createServerSupabaseClient();

  const [summary, receivedResult, distResult] = await Promise.all([
    getZakatSummary(masjidId),
    supabase
      .from('zakat_transactions')
      .select('id, amount_paisa, received_on, description_bn, is_published')
      .eq('masjid_id', masjidId)
      .order('received_on', { ascending: false })
      .limit(50),
    supabase
      .from('zakat_distributions')
      .select('id, category, amount_paisa, beneficiary_count, distributed_on, description_bn, private_recipient_note, is_published')
      .eq('masjid_id', masjidId)
      .order('distributed_on', { ascending: false })
      .limit(50),
  ]);

  if (receivedResult.error) console.error('Zakat received failed:', receivedResult.error.message);
  if (distResult.error) console.error('Zakat distributions failed:', distResult.error.message);

  const received = (receivedResult.data ?? []) as ReceivedRow[];
  const distributions = (distResult.data ?? []) as DistRow[];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">গৃহীত</p>
          <p className="text-lg font-bold text-ink">{formatTaka(summary?.received_paisa)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">বিতরণকৃত</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-verified)' }}>
            {formatTaka(summary?.distributed_paisa)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">অবশিষ্ট</p>
          <p className="text-lg font-bold text-ink">{formatTaka(summary?.balance_paisa)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">উপকারভোগী</p>
          <p className="text-lg font-bold text-ink">
            {toBanglaDigits(summary?.total_beneficiaries ?? 0)} জন
          </p>
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        উপরের হিসাব শুধুমাত্র <strong>প্রকাশিত</strong> রেকর্ড থেকে গণনা করা — খসড়া
        অন্তর্ভুক্ত নয়। যাকাত সাধারণ আয়-ব্যয় থেকে সম্পূর্ণ আলাদা।
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <ZakatReceiveForm masjidId={masjidId} />
        <ZakatDistributeForm masjidId={masjidId} />
      </div>

      {/* Received */}
      <section>
        <h3 className="font-semibold text-ink mb-3">গৃহীত যাকাত</h3>
        {received.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-ink-muted">কোনো রেকর্ড নেই।</p></div>
        ) : (
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
                <tr>
                  <th className="text-left p-3">তারিখ</th>
                  <th className="text-right p-3">পরিমাণ</th>
                  <th className="text-left p-3">অবস্থা</th>
                  <th className="text-right p-3">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {received.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 text-ink-muted">{new Date(r.received_on).toLocaleDateString('bn-BD')}</td>
                    <td className="p-3 text-right font-medium text-ink">{formatTaka(r.amount_paisa)}</td>
                    <td className="p-3">
                      <span className={`badge ${r.is_published ? 'badge-verified' : 'badge-pending'}`}>
                        {r.is_published ? 'প্রকাশিত' : 'খসড়া'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {!r.is_published && (
                        <ZakatPublishButton masjidId={masjidId} rowId={r.id} table="received" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Distributions */}
      <section>
        <h3 className="font-semibold text-ink mb-3">বিতরণকৃত যাকাত</h3>
        {distributions.length === 0 ? (
          <div className="card p-8 text-center"><p className="text-ink-muted">কোনো রেকর্ড নেই।</p></div>
        ) : (
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
                <tr>
                  <th className="text-left p-3">তারিখ</th>
                  <th className="text-left p-3">খাত</th>
                  <th className="text-right p-3">পরিমাণ</th>
                  <th className="text-right p-3">উপকারভোগী</th>
                  <th className="text-left p-3">অবস্থা</th>
                  <th className="text-right p-3">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {distributions.map((d) => (
                  <tr key={d.id}>
                    <td className="p-3 text-ink-muted whitespace-nowrap">
                      {new Date(d.distributed_on).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="p-3">
                      <span className="text-ink">{ZAKAT_LABELS[d.category] ?? d.category}</span>
                      {/* Visible to the finance team only; never rendered publicly. */}
                      {d.private_recipient_note && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
                          🔒 {d.private_recipient_note}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-ink">{formatTaka(d.amount_paisa)}</td>
                    <td className="p-3 text-right text-ink-muted">
                      {toBanglaDigits(d.beneficiary_count)} জন
                    </td>
                    <td className="p-3">
                      <span className={`badge ${d.is_published ? 'badge-verified' : 'badge-pending'}`}>
                        {d.is_published ? 'প্রকাশিত' : 'খসড়া'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {!d.is_published && (
                        <ZakatPublishButton masjidId={masjidId} rowId={d.id} table="distribution" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
