import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/auth/dal';
import { MasjidEditForm } from '@/features/admin/MasjidEditForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminMasjidEditPage({ params }: PageProps) {
  await requireModerator('/admin/masjids');
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  const [
    { data: masjid },
    { data: divisions },
    { data: districts },
  ] = await Promise.all([
    supabase.from('masjids').select('*').eq('id', id).single(),
    supabase.from('divisions').select('id, name_bn').order('sort_order'),
    supabase.from('districts').select('id, division_id, name_bn').order('sort_order'),
  ]);

  if (!masjid) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/masjids" className="btn btn-ghost btn-sm">← ফিরে যান</Link>
        <h1 className="text-xl font-bold text-ink">মসজিদ সম্পাদনা</h1>
      </div>

      <div className="mb-4 text-sm text-ink-muted" style={{ fontFamily: 'var(--font-latin)' }}>
        ID: {masjid.id} &bull; Code: {masjid.central_code} &bull; Slug: {masjid.slug}
      </div>

      <MasjidEditForm
        masjid={masjid as Record<string, unknown>}
        divisions={(divisions || []) as { id: number; name_bn: string }[]}
        districts={(districts || []) as { id: number; division_id: number; name_bn: string }[]}
      />
    </div>
  );
}
