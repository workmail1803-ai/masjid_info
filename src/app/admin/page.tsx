import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  // Parallel queries for dashboard metrics
  const [
    { count: totalMasjids },
    { count: publishedMasjids },
    { count: verifiedMasjids },
    { count: pendingSubmissions },
    { count: draftMasjids },
  ] = await Promise.all([
    supabase.from('masjids').select('id', { count: 'exact', head: true }),
    supabase.from('masjids').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('masjids').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    supabase.from('masjid_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('masjids').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
  ]);

  const metrics = [
    { label: 'মোট মসজিদ', value: totalMasjids || 0, color: 'text-ink' },
    { label: 'প্রকাশিত', value: publishedMasjids || 0, color: 'text-accent' },
    { label: 'যাচাইকৃত', value: verifiedMasjids || 0, color: 'text-verified' },
    { label: 'অপেক্ষমান জমা', value: pendingSubmissions || 0, color: 'text-warning' },
    { label: 'ড্রাফট', value: draftMasjids || 0, color: 'text-ink-muted' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">ড্যাশবোর্ড</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="card p-4">
            <div className={`text-2xl font-bold ${m.color}`} style={{ fontFamily: 'var(--font-latin)' }}>
              {m.value.toLocaleString()}
            </div>
            <div className="text-xs text-ink-muted mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/masjids/new" className="card p-4 hover:border-accent transition-all group">
          <h3 className="font-semibold text-ink group-hover:text-accent">➕ নতুন মসজিদ</h3>
          <p className="text-xs text-ink-muted mt-1">দ্রুত তথ্য এন্ট্রি</p>
        </Link>
        <Link href="/admin/submissions" className="card p-4 hover:border-accent transition-all group">
          <h3 className="font-semibold text-ink group-hover:text-accent">📥 জমা পর্যালোচনা</h3>
          <p className="text-xs text-ink-muted mt-1">{pendingSubmissions || 0} টি অপেক্ষমান</p>
        </Link>
        <Link href="/admin/import" className="card p-4 hover:border-accent transition-all group">
          <h3 className="font-semibold text-ink group-hover:text-accent">📤 বাল্ক আমদানি</h3>
          <p className="text-xs text-ink-muted mt-1">CSV/JSON আমদানি</p>
        </Link>
      </div>
    </div>
  );
}
