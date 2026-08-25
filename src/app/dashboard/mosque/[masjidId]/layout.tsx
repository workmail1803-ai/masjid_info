import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, canAtMosque } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { mosqueRoleLabels, type MosqueRole } from '@/types/mosque-admin';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ masjidId: string }>;
}

/**
 * Mosque management shell.
 *
 * Access requires an active membership at THIS mosque — a role at another
 * mosque grants nothing here. Each nav item is gated by the same capability
 * that guards its page and its RLS policy, so a treasurer never sees a
 * committee link they cannot use.
 */
export default async function MosqueDashboardLayout({ children, params }: LayoutProps) {
  const { masjidId } = await params;
  await requireUser(`/dashboard/mosque/${masjidId}`);

  const supabase = await createServerSupabaseClient();

  // RLS lets a member read their own mosque even when it is unpublished.
  const { data: masjid } = await supabase
    .from('masjids')
    .select('id, name_bn, name_en, slug, verification_status')
    .eq('id', masjidId)
    .maybeSingle();

  if (!masjid) notFound();

  const { data: membership } = await supabase
    .from('mosque_memberships')
    .select('role')
    .eq('masjid_id', masjidId)
    .eq('status', 'active')
    .maybeSingle();

  const [canFinance, canZakat] = await Promise.all([
    canAtMosque(masjidId, 'manage_finance'),
    canAtMosque(masjidId, 'manage_zakat'),
  ]);

  const base = `/dashboard/mosque/${masjidId}`;
  const nav = [
    { href: base, label: 'সারসংক্ষেপ', icon: '📊', show: true },
    { href: `${base}/finance`, label: 'আয়-ব্যয়', icon: '💰', show: canFinance },
    { href: `${base}/zakat`, label: 'যাকাত', icon: '🤲', show: canZakat },
  ].filter((n) => n.show);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-border">
        <div className="min-w-0">
          <Link href="/dashboard" className="text-xs text-ink-muted hover:text-accent">
            ← সব মসজিদ
          </Link>
          <h2 className="text-lg font-bold text-ink mt-1 truncate">{masjid.name_bn}</h2>
          <div className="flex items-center gap-2 mt-1">
            {membership && (
              <span className="badge badge-verified">
                {mosqueRoleLabels[membership.role as MosqueRole]}
              </span>
            )}
            {masjid.verification_status === 'verified' && (
              <span className="badge badge-verified">যাচাইকৃত</span>
            )}
          </div>
        </div>
        <Link href={`/masjid/${masjid.slug}`} className="btn btn-ghost btn-sm shrink-0">
          সর্বজনীন প্রোফাইল
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="মসজিদ ব্যবস্থাপনা">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="btn btn-ghost btn-sm whitespace-nowrap shrink-0"
          >
            <span aria-hidden className="mr-1">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
