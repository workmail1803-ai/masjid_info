import { requireModerator } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ContentForm, StatusToggle, ContentDelete, Disclosure,
  type ContentRow, type CategoryOpt,
} from './ContentEditor';
import type { ContentKind } from './content-actions';

/**
 * One manager screen shared by all four platform content types.
 *
 * The tables differ only in which column holds the body and whether they carry
 * an excerpt or a category, so a single component avoids four near-identical
 * pages drifting apart as the design changes.
 */

const CONFIG: Record<ContentKind, {
  table: string;
  bodyColumn: string;
  excerptColumn?: string;
  categoryType?: string;
  title: string;
  blurb: string;
  emptyHint: string;
}> = {
  news: {
    table: 'news_posts', bodyColumn: 'content_bn', excerptColumn: 'excerpt_bn',
    categoryType: 'news',
    title: 'সংবাদ ব্যবস্থাপনা',
    blurb: 'মসজিদ সম্পর্কিত সংবাদ লিখুন ও প্রকাশ করুন।',
    emptyHint: 'প্রথম সংবাদ লিখতে উপরের ফর্মটি ব্যবহার করুন।',
  },
  notices: {
    table: 'notices', bodyColumn: 'body_bn',
    title: 'নোটিশ ব্যবস্থাপনা',
    blurb: 'সাইটব্যাপী নোটিশ ও ঘোষণা। নির্দিষ্ট মসজিদের ঘোষণা সেই মসজিদের ড্যাশবোর্ড থেকে দিতে হয়।',
    emptyHint: 'সাইটব্যাপী কোনো নোটিশ নেই।',
  },
  topics: {
    table: 'islamic_topics', bodyColumn: 'content_bn', categoryType: 'topic',
    title: 'ইসলামিক বিষয় ব্যবস্থাপনা',
    blurb: 'ইসলামিক বিষয়ভিত্তিক লেখা প্রকাশ করুন।',
    emptyHint: 'কোনো বিষয় যুক্ত করা হয়নি।',
  },
  resources: {
    table: 'resources', bodyColumn: 'description_bn', categoryType: 'resource',
    title: 'উপকরণ ব্যবস্থাপনা',
    blurb: 'মসজিদ সম্পর্কিত উপকরণ, পুস্তিকা ও নির্দেশিকা।',
    emptyHint: 'কোনো উপকরণ যুক্ত করা হয়নি।',
  },
};

export async function ContentManagerPage({ kind }: { kind: ContentKind }) {
  await requireModerator(`/admin/${kind}`);

  const cfg = CONFIG[kind];
  const supabase = await createServerSupabaseClient();

  const columns = [
    'id', 'title_bn', 'title_en', 'status', 'published_at',
    cfg.bodyColumn,
    ...(cfg.excerptColumn ? [cfg.excerptColumn] : []),
    ...(kind === 'news' ? ['author_name'] : []),
    ...(kind === 'notices' ? ['is_featured'] : ['category_id']),
  ].join(', ');

  const [listResult, catResult] = await Promise.all([
    supabase.from(cfg.table).select(columns).order('created_at', { ascending: false }).limit(100),
    cfg.categoryType
      ? supabase.from('categories').select('id, name_bn').eq('type', cfg.categoryType).order('sort_order')
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (listResult.error) console.error(`${cfg.table} list failed:`, listResult.error.message);
  if (catResult.error) console.error('Category list failed:', catResult.error.message);

  const raw = (listResult.data ?? []) as unknown as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: String(r.id),
    title_bn: String(r.title_bn ?? ''),
    title_en: (r.title_en as string) ?? null,
    body: (r[cfg.bodyColumn] as string) ?? null,
    excerpt: cfg.excerptColumn ? ((r[cfg.excerptColumn] as string) ?? null) : null,
    author_name: (r.author_name as string) ?? null,
    category_id: (r.category_id as number) ?? null,
    status: String(r.status ?? 'draft'),
    is_featured: Boolean(r.is_featured),
    published_at: (r.published_at as string) ?? null,
  }));

  const categories = (catResult.data ?? []) as CategoryOpt[];
  const published = rows.filter((r) => r.status === 'published').length;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">{cfg.title}</h1>
        <p className="text-sm text-ink-muted mt-0.5">{cfg.blurb}</p>
        {rows.length > 0 && (
          <p className="text-xs text-ink-faint mt-1">
            মোট {rows.length}টি · প্রকাশিত {published}টি · খসড়া {rows.length - published}টি
          </p>
        )}
      </div>

      <Disclosure summary={`+ নতুন ${cfg.title.split(' ')[0]}`}>
        <ContentForm kind={kind} categories={categories} />
      </Disclosure>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কিছু নেই।</p>
          <p className="text-sm text-ink-faint mt-1">{cfg.emptyHint}</p>
        </div>
      ) : (
        rows.map((row) => (
          <details key={row.id} className="card p-5">
            <summary className="cursor-pointer select-none flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink">{row.title_bn}</span>
              <span className={`badge ${row.status === 'published' ? 'badge-verified' : 'badge-pending'}`}>
                {row.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}
              </span>
              {row.is_featured && <span className="badge badge-verified">ফিচার্ড</span>}
              {row.published_at && (
                <span className="text-xs text-ink-faint">
                  {new Date(row.published_at).toLocaleDateString('bn-BD')}
                </span>
              )}
            </summary>

            <div className="mt-4 pt-4 border-t border-border">
              <ContentForm kind={kind} row={row} categories={categories} />
              <div className="mt-3 pt-3 border-t border-border flex justify-end gap-2">
                <StatusToggle kind={kind} id={row.id} status={row.status} />
                <ContentDelete kind={kind} id={row.id} />
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
