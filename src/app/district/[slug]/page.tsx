import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDistrictBySlug, getUpazilasByDistrict, getMasjidCountByDistrict } from '@/lib/services/geography.service';
import { getMasjidsByDistrict } from '@/lib/services/masjid.service';

export const revalidate = 3600;

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const district = await getDistrictBySlug(slug);
  if (!district) return { title: 'জেলা পাওয়া যায়নি' };
  return { title: `${district.name_bn} জেলা`, description: `${district.name_bn} জেলার মসজিদ ডিরেক্টরি` };
}

export default async function DistrictPage({ params }: PageProps) {
  const { slug } = await params;
  const district = await getDistrictBySlug(slug);
  if (!district) notFound();

  const [upazilas, count, { results: masjids }] = await Promise.all([
    getUpazilasByDistrict(district.id),
    getMasjidCountByDistrict(district.id),
    getMasjidsByDistrict(district.id, 1, 10),
  ]);

  return (
    <div className="container-wide py-6 md:py-8">
      <nav className="text-xs text-ink-muted mb-4">
        <Link href="/" className="hover:text-accent">হোম</Link> /
        {district.division && <> <Link href={`/division/${district.division.slug}`} className="hover:text-accent">{district.division.name_bn}</Link> / </>}
        <span className="text-ink">{district.name_bn}</span>
      </nav>

      <div className="divider-accent mb-3" />
      <h1 className="text-2xl md:text-3xl font-bold text-ink mb-1">{district.name_bn} জেলা</h1>
      <p className="text-sm text-ink-muted mb-2" style={{ fontFamily: 'var(--font-latin)' }}>{district.name_en} District</p>
      <p className="text-sm text-ink-muted mb-8">
        মোট <span className="font-semibold text-ink" style={{ fontFamily: 'var(--font-latin)' }}>{count.toLocaleString('bn-BD')}</span> টি মসজিদ
      </p>

      {upazilas.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-ink mb-3">উপজেলাসমূহ</h2>
          <div className="flex flex-wrap gap-2">
            {upazilas.map((upazila) => (
              <Link key={upazila.id} href={`/upazila/${upazila.slug}`} className="badge badge-unverified hover:bg-accent-light hover:text-accent transition-colors cursor-pointer">
                {upazila.name_bn}
              </Link>
            ))}
          </div>
        </section>
      )}

      {masjids.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-ink mb-3">মসজিদসমূহ</h2>
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
          {count > 10 && (
            <Link href={`/masjid?district_id=${district.id}`} className="btn btn-secondary btn-sm mt-4">সকল মসজিদ দেখুন</Link>
          )}
        </section>
      )}
    </div>
  );
}
