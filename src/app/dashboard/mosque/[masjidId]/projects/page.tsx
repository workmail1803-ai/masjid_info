import type { Metadata } from 'next';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatTaka, toBanglaDigits } from '@/lib/services/mosque.service';
import {
  ProjectForm, ProjectDelete, ProjectExpenseForm, ProjectUpdateForm,
  Disclosure, type ProjectValues,
} from '@/features/mosque/CampaignForms';

export const metadata: Metadata = { title: 'প্রকল্প', robots: { index: false, follow: false } };

export default async function ProjectsPage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_projects', `/dashboard/mosque/${masjidId}/projects`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_projects').select('*').eq('masjid_id', masjidId)
    .order('created_at', { ascending: false });
  if (error) console.error('Project load failed:', error.message);

  const projects = (data ?? []) as unknown as ProjectValues[];
  const totals = await Promise.all(
    projects.map((p) => supabase.rpc('project_totals', { p_project_id: p.id }))
  );

  return (
    <div className="max-w-3xl space-y-5">
      <Disclosure summary="+ নতুন প্রকল্প">
        <ProjectForm masjidId={masjidId} />
      </Disclosure>

      {projects.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted">কোনো প্রকল্প নেই।</p>
          <p className="text-sm text-ink-faint mt-1">
            যেমন: ছাদ সংস্কার, মাদ্রাসা ভবন, সোলার প্যানেল স্থাপন।
          </p>
        </div>
      ) : (
        projects.map((p, i) => {
          const t = totals[i].data?.[0] ?? {};
          return (
            <details key={p.id} className="card p-5">
              <summary className="cursor-pointer select-none flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-ink">{p.title_bn}</span>
                <span className="badge badge-pending">{p.status}</span>
                {!p.is_published && <span className="badge badge-unverified">অপ্রকাশিত</span>}
                <span className="ml-auto text-xs text-ink-muted">
                  ব্যয় {formatTaka(t.spent_paisa)} / {formatTaka(t.budget_paisa)} · {toBanglaDigits(p.progress_percent)}%
                </span>
              </summary>

              <div className="h-2 rounded-full overflow-hidden my-3"
                style={{ background: 'var(--color-surface-alt)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, p.progress_percent)}%`, background: 'var(--color-accent)' }} />
              </div>

              <div className="pt-3 border-t border-border space-y-5">
                <ProjectForm masjidId={masjidId} project={p} />

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-ink mb-2">ব্যয় যুক্ত করুন</h4>
                  <ProjectExpenseForm masjidId={masjidId} projectId={p.id} />
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-ink mb-2">অগ্রগতি হালনাগাদ</h4>
                  <ProjectUpdateForm masjidId={masjidId} projectId={p.id} />
                </div>

                <div className="pt-3 border-t border-border flex justify-end">
                  <ProjectDelete masjidId={masjidId} projectId={p.id} />
                </div>
              </div>
            </details>
          );
        })
      )}
    </div>
  );
}
