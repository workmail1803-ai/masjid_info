import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Masjid } from '@/types/database';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminMasjidsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const q = params.q || '';

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('masjids')
    .select('id, central_code, district_code, slug, name_bn, name_en, verification_status, status, has_image, created_at, district:districts(name_bn)', { count: 'exact' });

  if (q) {
    query = query.or(`name_bn.ilike.%${q}%,name_en.ilike.%${q}%,central_code.ilike.%${q}%`);
  }

  const { data: masjids, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">মসজিদ ব্যবস্থাপনা</h1>
        <Link href="/admin/masjids/new" className="btn btn-primary btn-sm">+ নতুন মসজিদ</Link>
      </div>

      {/* Search */}
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="নাম বা কোড দিয়ে খুঁজুন..."
          className="input max-w-md"
        />
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
              <tr>
                <th className="text-left p-3">কোড</th>
                <th className="text-left p-3">নাম</th>
                <th className="text-left p-3">জেলা</th>
                <th className="text-left p-3">অবস্থা</th>
                <th className="text-left p-3">যাচাই</th>
                <th className="text-right p-3">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(masjids || []).map((m: any) => (
                <tr key={m.id} className="hover:bg-surface-alt/50">
                  <td className="p-3 font-mono text-xs" style={{ fontFamily: 'var(--font-latin)' }}>{m.central_code}</td>
                  <td className="p-3">
                    <div className="font-medium text-ink">{m.name_bn}</div>
                    {m.name_en && <div className="text-xs text-ink-muted" style={{ fontFamily: 'var(--font-latin)' }}>{m.name_en}</div>}
                  </td>
                  <td className="p-3 text-ink-muted">{m.district?.name_bn || '—'}</td>
                  <td className="p-3"><span className={`badge ${m.status === 'published' ? 'badge-verified' : 'badge-unverified'}`}>{m.status}</span></td>
                  <td className="p-3"><span className={`badge ${m.verification_status === 'verified' ? 'badge-verified' : 'badge-pending'}`}>{m.verification_status}</span></td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/masjids/${m.id}`} className="btn btn-ghost btn-sm">সম্পাদনা</Link>
                  </td>
                </tr>
              ))}
              {(!masjids || masjids.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-muted">কোনো মসজিদ পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && <a href={`/admin/masjids?page=${page - 1}&q=${q}`} className="btn btn-ghost btn-sm">← আগের</a>}
          <span className="text-sm text-ink-muted">পৃষ্ঠা {page} / {totalPages}</span>
          {page < totalPages && <a href={`/admin/masjids?page=${page + 1}&q=${q}`} className="btn btn-ghost btn-sm">পরের →</a>}
        </div>
      )}
    </div>
  );
}
