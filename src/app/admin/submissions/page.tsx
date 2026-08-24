import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AdminSubmissionsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: submissions } = await supabase
    .from('masjid_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">জমা পর্যালোচনা</h1>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
              <tr>
                <th className="text-left p-3">নাম</th>
                <th className="text-left p-3">জমা দানকারী</th>
                <th className="text-left p-3">তারিখ</th>
                <th className="text-left p-3">অবস্থা</th>
                <th className="text-right p-3">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(submissions || []).map((s: any) => (
                <tr key={s.id} className="hover:bg-surface-alt/50">
                  <td className="p-3">
                    <div className="font-medium text-ink">{s.name_bn}</div>
                    {s.name_en && <div className="text-xs text-ink-muted">{s.name_en}</div>}
                  </td>
                  <td className="p-3 text-ink-muted text-xs">{s.submitter_name || '—'}</td>
                  <td className="p-3 text-ink-muted text-xs" style={{ fontFamily: 'var(--font-latin)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`badge ${s.status === 'pending_review' ? 'badge-pending' : s.status === 'approved' ? 'badge-verified' : 'badge-unverified'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/submissions/${s.id}`} className="btn btn-ghost btn-sm">পর্যালোচনা</Link>
                  </td>
                </tr>
              ))}
              {(!submissions || submissions.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-ink-muted">কোনো জমা নেই</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
