import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getUpazilaBySlug } from '@/lib/services/geography.service';
import { getMasjidsByUpazila } from '@/lib/services/masjid.service';

export const revalidate = 3600;
interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const upazila = await getUpazilaBySlug(slug);
  if (!upazila) return { title: 'উপজেলা পাওয়া যায়নি' };
  return { title: `${upazila.name_bn} উপজেলা`, description: `${upazila.name_bn} উপজেলার মসজিদ ডিরেক্টরি` };
}

export default async function UpazilaPage({ params }: PageProps) {
  const { slug } = await params;
  const upazila = await getUpazilaBySlug(slug);
  if (!upazila) notFound();

  const { results: masjids, totalCount } = await getMasjidsByUpazila(upazila.id, 1, 20);

  return (
    <div className="container-wide py-6 md:py-8">
      <nav className="text-xs text-ink-muted mb-4">
        <Link href="/" className="hover:text-accent">হোম</Link> /
        <Link href={`/division/${upazila.district.division.slug}`} className="hover:text-accent"> {upazila.district.division.name_bn}</Link> /
        <Link href={`/district/${upazila.district.slug}`} className="hover:text-accent"> {upazila.district.name_bn}</Link> /
        <span className="text-ink"> {upazila.name_bn}</span>
      </nav>

      <div className="divider-accent mb-3" />
      <h1 className="text-2xl font-bold text-ink mb-1">{upazila.name_bn} উপজেলা</h1>
      <p className="text-sm text-ink-muted mb-6">
        <span style={{ fontFamily: 'var(--font-latin)' }}>{totalCount.toLocaleString('bn-BD')}</span> টি মসজিদ
      </p>

      {masjids.length > 0 ? (
        <div className="space-y-2">
          {masjids.map((m) => (
            <Link key={m.id} href={`/masjid/${m.slug}`} className="card p-3 flex items-center gap-3 hover:border-accent transition-all">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{m.name_bn}</p>
                {m.area_name_bn && <p className="text-xs text-ink-muted">{m.area_name_bn}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-ink-muted">এই উপজেলায় এখনো কোনো মসজিদের তথ্য পাওয়া যায়নি।</p>
          <Link href="/masjid/add" className="btn btn-secondary btn-sm mt-4">একটি মসজিদ যোগ করুন</Link>
        </div>
      )}
    </div>
  );
}
