import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canAtMosque } from '@/lib/auth/dal';
import {
  getFinancialSummary, getZakatSummary, getTransparencyScore, formatTaka, toBanglaDigits,
} from '@/lib/services/mosque.service';

export const metadata: Metadata = {
  title: 'মসজিদ সারসংক্ষেপ',
  robots: { index: false, follow: false },
};

export default async function MosqueOverviewPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  const supabase = await createServerSupabaseClient();

  const canFinance = await canAtMosque(masjidId, 'manage_finance');

  const [finance, zakat, transparency, drafts] = await Promise.all([
    getFinancialSummary(masjidId),
    getZakatSummary(masjidId),
    getTransparencyScore(masjidId),
    // Unpublished rows are the team's to-do list — public totals ignore them.
    canFinance
      ? supabase
          .from('financial_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('masjid_id', masjidId)
          .eq('is_published', false)
      : Promise.resolve({ count: 0 }),
  ]);

  const draftCount = ('count' in drafts ? drafts.count : 0) ?? 0;
  const missing = transparency.factors.filter((f) => !f.earned);

  return (
    <div className="space-y-6">
      {draftCount > 0 && (
        <div className="card card-accent p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-ink">
            <strong>{toBanglaDigits(draftCount)}</strong> টি লেনদেন এখনো প্রকাশ করা হয়নি।
            সর্বসাধারণ এগুলো দেখতে পাচ্ছে না।
          </p>
          <Link href={`/dashboard/mosque/${masjidId}/finance`} className="btn btn-secondary btn-sm shrink-0">
            দেখুন
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">প্রকাশিত আয়</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-verified)' }}>
            {formatTaka(finance?.income_paisa)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">প্রকাশিত ব্যয়</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-error)' }}>
            {formatTaka(finance?.expense_paisa)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">উদ্বৃত্ত</p>
          <p className="text-lg font-bold text-ink">{formatTaka(finance?.net_paisa)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">যাকাত অবশিষ্ট</p>
          <p className="text-lg font-bold text-ink">{formatTaka(zakat?.balance_paisa)}</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-ink">স্বচ্ছতা স্কোর</h3>
          <span className="text-2xl font-bold text-accent" style={{ fontFamily: 'var(--font-latin)' }}>
            {toBanglaDigits(transparency.total)}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: 'var(--color-surface-alt)' }}>
          <div className="h-full rounded-full"
            style={{ width: `${transparency.total}%`, background: 'var(--color-accent)' }} />
        </div>

        {missing.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-verified)' }}>
            ✓ সব তথ্য সম্পূর্ণ।
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-light mb-2">স্কোর বাড়াতে যা করতে পারেন:</p>
            <ul className="space-y-1">
              {missing.map((f) => (
                <li key={f.factor} className="flex items-center gap-2 text-sm text-ink-muted">
                  <span aria-hidden style={{ color: 'var(--color-warning)' }}>○</span>
                  {f.label_bn}
                  <span className="ml-auto text-xs text-ink-faint" style={{ fontFamily: 'var(--font-latin)' }}>
                    +{toBanglaDigits(f.max_points)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
