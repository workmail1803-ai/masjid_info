import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDivisionBySlug, getDistrictsByDivision } from '@/lib/services/geography.service';
import { siteConfig } from '@/config/site';

export const revalidate = 3600;

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const division = await getDivisionBySlug(slug);
  if (!division) return { title: 'বিভাগ পাওয়া যায়নি' };
  return {
    title: `${division.name_bn} বিভাগ`,
    description: `${division.name_bn} বিভাগের মসজিদ ডিরেক্টরি — ${siteConfig.tagline}`,
  };
}

export default async function DivisionPage({ params }: PageProps) {
  const { slug } = await params;
  const division = await getDivisionBySlug(slug);
  if (!division) notFound();

  const districts = await getDistrictsByDivision(division.id);

  return (
    <div className="container-wide py-6 md:py-8">
      <nav className="text-xs text-ink-muted mb-4">
        <a href="/" className="hover:text-accent">হোম</a> / <span className="text-ink">{division.name_bn} বিভাগ</span>
      </nav>

      <div className="divider-accent mb-3" />
      <h1 className="text-2xl md:text-3xl font-bold text-ink mb-2">{division.name_bn} বিভাগ</h1>
      <p className="text-sm text-ink-muted mb-8" style={{ fontFamily: 'var(--font-latin)' }}>{division.name_en} Division</p>

      <h2 className="text-lg font-semibold text-ink mb-4">জেলাসমূহ</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {districts.map((district) => (
          <Link key={district.id} href={`/district/${district.slug}`} className="card p-4 hover:border-accent transition-all group">
            <h3 className="font-semibold text-ink group-hover:text-accent">{district.name_bn}</h3>
            <p className="text-xs text-ink-muted mt-0.5" style={{ fontFamily: 'var(--font-latin)' }}>{district.name_en}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link href={`/masjid?division_id=${division.id}`} className="btn btn-primary">
          {division.name_bn} বিভাগের সকল মসজিদ দেখুন
        </Link>
      </div>
    </div>
  );
}
