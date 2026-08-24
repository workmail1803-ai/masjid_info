import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMasjidBySlug, getMasjidImages } from '@/lib/services/masjid.service';
import { structureTypeLabels, verificationLabels } from '@/types/database';
import { siteConfig } from '@/config/site';

export const revalidate = 3600; // 1 hour ISR

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const masjid = await getMasjidBySlug(slug);
  if (!masjid) return { title: 'মসজিদ পাওয়া যায়নি' };

  const title = `${masjid.name_bn}${masjid.name_en ? ` — ${masjid.name_en}` : ''}`;
  const description = masjid.description_bn || `${masjid.name_bn}, ${masjid.district?.name_bn || ''} — ${siteConfig.tagline}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteConfig.url}/masjid/${slug}`,
    },
    alternates: {
      canonical: `${siteConfig.url}/masjid/${slug}`,
    },
  };
}

export default async function MasjidDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const masjid = await getMasjidBySlug(slug);

  if (!masjid) notFound();

  const images = await getMasjidImages(masjid.id);
  const primaryImage = images.find(img => img.is_primary) || images[0];

  return (
    <div className="container-wide py-6 md:py-8">
      {/* Breadcrumbs */}
      <nav className="text-xs text-ink-muted mb-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 flex-wrap">
          <li><Link href="/" className="hover:text-accent">হোম</Link></li>
          <li>/</li>
          <li><Link href="/masjid" className="hover:text-accent">ডিরেক্টরি</Link></li>
          <li>/</li>
          {masjid.district && (
            <>
              <li><Link href={`/district/${masjid.district.slug}`} className="hover:text-accent">{masjid.district.name_bn}</Link></li>
              <li>/</li>
            </>
          )}
          <li className="text-ink truncate max-w-[200px]">{masjid.name_bn}</li>
        </ol>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Section */}
          <section>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-ink">{masjid.name_bn}</h1>
                {masjid.name_en && (
                  <p className="text-lg text-ink-light mt-1" style={{ fontFamily: 'var(--font-latin)' }}>
                    {masjid.name_en}
                  </p>
                )}
              </div>
              {masjid.verification_status === 'verified' && (
                <span className="badge badge-verified shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  যাচাইকৃত
                </span>
              )}
            </div>

            {/* Image */}
            {primaryImage && primaryImage.storage_path && (
              <div className="rounded-md overflow-hidden bg-surface-alt aspect-[16/9]">
                <img
                  src={primaryImage.detail_path || primaryImage.storage_path}
                  alt={masjid.name_bn}
                  className="w-full h-full object-cover"
                />
                {primaryImage.attribution_required && primaryImage.attribution_text && (
                  <p className="text-[10px] text-ink-faint p-2 bg-surface-alt">
                    📷 {primaryImage.attribution_text}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Facts Grid */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink mb-4 uppercase tracking-wider" style={{ fontFamily: 'var(--font-latin)' }}>
              Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FactItem label="কোড" value={masjid.central_code} mono />
              <FactItem label="জেলা কোড" value={masjid.district_code} mono />
              <FactItem label="বিভাগ" value={masjid.division?.name_bn} />
              <FactItem label="জেলা" value={masjid.district?.name_bn} />
              <FactItem label="উপজেলা" value={masjid.upazila?.name_bn} />
              <FactItem label="এলাকা" value={masjid.area_name_bn} />
              <FactItem label="ধরন" value={structureTypeLabels[masjid.structure_type]?.bn} />
              <FactItem label="প্রতিষ্ঠাকাল" value={masjid.established_year ? `${masjid.established_year}` : undefined} />
              <FactItem label="অবস্থা" value={verificationLabels[masjid.verification_status]?.bn} />
            </div>
          </section>

          {/* Description */}
          {masjid.description_bn && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-3">বিবরণ</h2>
              <p className="text-sm text-ink-light leading-relaxed whitespace-pre-line">
                {masjid.description_bn}
              </p>
              {masjid.description_en && (
                <p className="text-sm text-ink-muted leading-relaxed mt-4 whitespace-pre-line" style={{ fontFamily: 'var(--font-latin)' }}>
                  {masjid.description_en}
                </p>
              )}
            </section>
          )}

          {/* Address */}
          {(masjid.address_bn || masjid.address_en) && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-3">ঠিকানা</h2>
              {masjid.address_bn && <p className="text-sm text-ink-light">{masjid.address_bn}</p>}
              {masjid.address_en && <p className="text-sm text-ink-muted mt-1" style={{ fontFamily: 'var(--font-latin)' }}>{masjid.address_en}</p>}

              {masjid.latitude && masjid.longitude && (
                <div className="mt-4">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${masjid.latitude}&mlon=${masjid.longitude}#map=17/${masjid.latitude}/${masjid.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    🗺️ মানচিত্রে দেখুন
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Gallery */}
          {images.length > 1 && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink mb-3">ছবি গ্যালারি</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="rounded-sm overflow-hidden bg-surface-alt aspect-square">
                    {img.storage_path && (
                      <img
                        src={img.card_path || img.storage_path}
                        alt={masjid.name_bn}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Contact Card */}
          {(masjid.contact_number || masjid.email) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">যোগাযোগ</h3>
              {masjid.contact_number && (
                <div className="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted shrink-0">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <a href={`tel:${masjid.contact_number}`} className="text-sm text-accent hover:underline" style={{ fontFamily: 'var(--font-latin)' }}>
                    {masjid.contact_number}
                  </a>
                </div>
              )}
              {masjid.email && (
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted shrink-0">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <a href={`mailto:${masjid.email}`} className="text-sm text-accent hover:underline" style={{ fontFamily: 'var(--font-latin)' }}>
                    {masjid.email}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Ratings */}
          {masjid.rating_count > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-ink mb-2">রেটিং</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-ink" style={{ fontFamily: 'var(--font-latin)' }}>
                  {masjid.rating_average}
                </span>
                <div className="text-xs text-ink-muted">
                  <span style={{ fontFamily: 'var(--font-latin)' }}>{masjid.rating_count}</span> টি মূল্যায়ন
                </div>
              </div>
            </div>
          )}

          {/* Location info */}
          {masjid.latitude && masjid.longitude && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-ink mb-2">স্থানাঙ্ক</h3>
              <p className="text-xs text-ink-muted font-mono">
                {masjid.latitude.toFixed(6)}, {masjid.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Correction request */}
          <div className="card p-4">
            <Link href={`/contact?masjid=${masjid.slug}&type=correction`} className="btn btn-ghost btn-sm w-full">
              তথ্য সংশোধনের অনুরোধ
            </Link>
          </div>

          {/* Data source */}
          {masjid.source_type && (
            <div className="text-xs text-ink-faint p-2">
              <p>তথ্যসূত্র: {masjid.source_name || masjid.source_type}</p>
              {masjid.verified_at && (
                <p>যাচাই: {new Date(masjid.verified_at).toLocaleDateString('bn-BD')}</p>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'PlaceOfWorship',
            name: masjid.name_bn,
            alternateName: masjid.name_en || undefined,
            address: {
              '@type': 'PostalAddress',
              addressLocality: masjid.district?.name_en,
              addressRegion: masjid.division?.name_en,
              addressCountry: 'BD',
              streetAddress: masjid.address_en || masjid.address_bn || undefined,
            },
            geo: masjid.latitude && masjid.longitude ? {
              '@type': 'GeoCoordinates',
              latitude: masjid.latitude,
              longitude: masjid.longitude,
            } : undefined,
            telephone: masjid.contact_number || undefined,
            url: `${siteConfig.url}/masjid/${masjid.slug}`,
          }),
        }}
      />
    </div>
  );
}

function FactItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`text-sm font-medium text-ink mt-0.5 ${mono ? 'font-mono' : ''}`} style={mono ? { fontFamily: 'var(--font-latin)' } : undefined}>
        {value || <span className="text-ink-faint">তথ্য পাওয়া যায়নি</span>}
      </dd>
    </div>
  );
}
