import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatTaka, toBanglaDigits } from '@/lib/services/mosque.service';
import {
  TransactionForm, PublishButton, DeleteButton, type CategoryOption,
} from '@/features/mosque/FinanceForms';

export const metadata: Metadata = {
  title: 'আয়-ব্যয়',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

interface TxnRow {
  id: string;
  direction: 'income' | 'expense';
  amount_paisa: number;
  occurred_on: string;
  description_bn: string | null;
  reference: string | null;
  approval: string;
  is_published: boolean;
  category: { name_bn: string } | null;
}

export default async function FinancePage({
  params, searchParams,
}: {
  params: Promise<{ masjidId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { masjidId } = await params;
  const { page: pageParam } = await searchParams;

  // Authorization, checked against the database — not just the nav being hidden.
  await requireMosqueCapability(masjidId, 'manage_finance', `/dashboard/mosque/${masjidId}/finance`);

  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createServerSupabaseClient();

  const [txnResult, catResult] = await Promise.all([
    supabase
      .from('financial_transactions')
      .select(
        'id, direction, amount_paisa, occurred_on, description_bn, reference, approval, is_published, category:financial_categories(name_bn)',
        { count: 'exact' }
      )
      .eq('masjid_id', masjidId)
      .order('occurred_on', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    // Platform defaults (masjid_id IS NULL) plus this mosque's own categories.
    supabase
      .from('financial_categories')
      .select('id, name_bn, direction')
      .or(`masjid_id.is.null,masjid_id.eq.${masjidId}`)
      .order('sort_order'),
  ]);

  if (txnResult.error) console.error('Txn list failed:', txnResult.error.message);
  if (catResult.error) console.error('Category list failed:', catResult.error.message);

  const rows = (txnResult.data ?? []) as unknown as TxnRow[];
  const total = txnResult.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const categories = (catResult.data ?? []) as CategoryOption[];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-end justify-between">
          <h3 className="font-semibold text-ink">
            লেনদেন
            <span className="ml-2 text-xs font-normal text-ink-muted">
              ({toBanglaDigits(total)}টি)
            </span>
          </h3>
        </div>

        {rows.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-ink-muted">এখনো কোনো লেনদেন যোগ করা হয়নি।</p>
            <p className="text-sm text-ink-faint mt-1">ডানপাশের ফর্ম থেকে শুরু করুন।</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="text-left p-3">তারিখ</th>
                    <th className="text-left p-3">খাত</th>
                    <th className="text-right p-3">পরিমাণ</th>
                    <th className="text-left p-3">অবস্থা</th>
                    <th className="text-right p-3">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-alt/50">
                      <td className="p-3 text-ink-muted whitespace-nowrap">
                        {new Date(t.occurred_on).toLocaleDateString('bn-BD')}
                      </td>
                      <td className="p-3">
                        <span className="text-ink">{t.category?.name_bn ?? '—'}</span>
                        {t.description_bn && (
                          <p className="text-xs text-ink-faint truncate max-w-[220px]">
                            {t.description_bn}
                          </p>
                        )}
                      </td>
                      <td
                        className="p-3 text-right font-medium whitespace-nowrap"
                        style={{
                          color: t.direction === 'income'
                            ? 'var(--color-verified)' : 'var(--color-error)',
                        }}
                      >
                        {t.direction === 'income' ? '+' : '−'} {formatTaka(t.amount_paisa)}
                      </td>
                      <td className="p-3">
                        <span className={`badge ${t.is_published ? 'badge-verified' : 'badge-pending'}`}>
                          {t.is_published ? 'প্রকাশিত' : 'খসড়া'}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {!t.is_published && (
                          <PublishButton masjidId={masjidId} txnId={t.id} />
                        )}
                        <DeleteButton masjidId={masjidId} txnId={t.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-3 border-t border-border text-sm">
                {page > 1 && (
                  <a href={`?page=${page - 1}`} className="btn btn-ghost btn-sm">← আগের</a>
                )}
                <span className="text-ink-muted">
                  পৃষ্ঠা {toBanglaDigits(page)} / {toBanglaDigits(totalPages)}
                </span>
                {page < totalPages && (
                  <a href={`?page=${page + 1}`} className="btn btn-ghost btn-sm">পরের →</a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <TransactionForm masjidId={masjidId} categories={categories} />
      </div>
    </div>
  );
}
