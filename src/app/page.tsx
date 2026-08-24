import Link from 'next/link';
import { Suspense } from 'react';
import { HomepageSearch } from '@/features/directory/HomepageSearch';
import { getDirectoryStats } from '@/lib/services/stats.service';
import { getDivisions } from '@/lib/services/geography.service';
import { getRecentMasjids, getRecentlyVerified } from '@/lib/services/masjid.service';
import { getFeaturedNotices } from '@/lib/services/content.service';

export const revalidate = 300; // 5 minutes cache

export default async function HomePage() {
  // Parallel data fetching — no waterfalls
  const [stats, divisions, recentMasjids, verifiedMasjids, notices] = await Promise.all([
    getDirectoryStats(),
    getDivisions(),
    getRecentMasjids(6),
    getRecentlyVerified(6),
    getFeaturedNotices(3),
  ]);

  return (
    <>
      {/* ============================================================
          Atlas Hero — Editorial search interface
          ============================================================ */}
      <section className="relative overflow-hidden">
        {/* Subtle geometric background */}
        <div className="absolute inset-0 pattern-geo pointer-events-none" aria-hidden="true" />

        <div className="container-wide relative py-12 md:py-20 lg:py-24">
          <div className="max-w-3xl">
            {/* Editorial headline */}
            <div className="divider-accent mb-6" />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink leading-tight mb-4 text-editorial">
              বাংলাদেশের মসজিদগুলোকে<br className="hidden md:block" />
              এক জায়গায় খুঁজে পাওয়া সহজ হোক।
            </h1>
            <p className="text-lg text-ink-light mb-8 max-w-xl">
              সারাদেশের মসজিদের তথ্য, অবস্থান, এবং যোগাযোগের ঠিকানা — একটি নির্ভরযোগ্য জাতীয় ডিরেক্টরি।
            </p>

            {/* Search */}
            <Suspense fallback={<div className="h-14 skeleton rounded-lg" />}>
              <HomepageSearch />
            </Suspense>

            {/* Search examples */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-muted">
              <span>উদাহরণ:</span>
              {['বায়তুল মোকাররম', 'Dhaka', 'চট্টগ্রাম', 'Sylhet', 'ধানমন্ডি'].map((example) => (
                <Link
                  key={example}
                  href={`/masjid?q=${encodeURIComponent(example)}`}
                  className="text-accent hover:underline"
                >
                  {example}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          Statistics Bar
          ============================================================ */}
      <section className="border-y border-border bg-surface-elevated">
        <div className="container-wide py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <StatItem value={stats.total_masjids} label="মোট মসজিদ" />
            <StatItem value={stats.verified_masjids} label="যাচাইকৃত" />
            <StatItem value={stats.districts_covered} label="জেলা" />
            <StatItem value={stats.upazilas_covered} label="উপজেলা" />
            <StatItem value={stats.recently_added} label="সাম্প্রতিক" className="hidden md:flex" />
          </div>
        </div>
      </section>

      {/* ============================================================
          Browse Bangladesh — Division grid
          ============================================================ */}
      <section className="container-wide py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="divider-accent mb-3" />
            <h2 className="text-xl md:text-2xl font-bold text-ink">বাংলাদেশ ব্রাউজ করুন</h2>
            <p className="text-sm text-ink-muted mt-1">বিভাগ অনুসারে মসজিদ খুঁজুন</p>
          </div>
          <Link href="/masjid" className="btn btn-ghost btn-sm">
            সব দেখুন →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {divisions.map((division) => (
            <Link
              key={division.id}
              href={`/division/${division.slug}`}
              className="card p-4 hover:border-accent group transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-ink group-hover:text-accent transition-colors">
                    {division.name_bn}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5" style={{ fontFamily: 'var(--font-latin)' }}>
                    {division.name_en}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-sm bg-accent-light flex items-center justify-center">
                  <span className="text-xs font-bold text-accent" style={{ fontFamily: 'var(--font-latin)' }}>
                    {division.code}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================================
          Recent Mosques
          ============================================================ */}
      {recentMasjids.length > 0 && (
        <section className="container-wide py-12 border-t border-border">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Recently Added */}
            <div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-ink">সম্প্রতি যোগ হয়েছে</h2>
                </div>
              </div>
              <div className="space-y-2">
                {recentMasjids.map((masjid) => (
                  <Link
                    key={masjid.id}
                    href={`/masjid/${masjid.slug}`}
                    className="card p-3 flex items-center gap-3 hover:border-accent transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{masjid.name_bn}</p>
                      {masjid.area_name_bn && (
                        <p className="text-xs text-ink-muted truncate">{masjid.area_name_bn}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recently Verified */}
            <div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-ink">সম্প্রতি যাচাইকৃত</h2>
                </div>
              </div>
              <div className="space-y-2">
                {verifiedMasjids.map((masjid) => (
                  <Link
                    key={masjid.id}
                    href={`/masjid/${masjid.slug}`}
                    className="card p-3 flex items-center gap-3 hover:border-accent transition-all"
                  >
                    <div className="shrink-0">
                      <VerifiedIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{masjid.name_bn}</p>
                      {masjid.area_name_bn && (
                        <p className="text-xs text-ink-muted truncate">{masjid.area_name_bn}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          Notices Preview
          ============================================================ */}
      {notices.length > 0 && (
        <section className="container-wide py-12 border-t border-border">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="divider-accent mb-3" />
              <h2 className="text-xl font-bold text-ink">নোটিশ বোর্ড</h2>
            </div>
            <Link href="/notices" className="btn btn-ghost btn-sm">সব দেখুন →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/notices/${notice.slug}`}
                className="card card-accent p-4 hover:border-accent transition-all"
              >
                <h3 className="font-semibold text-sm text-ink mb-1 line-clamp-2">{notice.title_bn}</h3>
                {notice.body_bn && (
                  <p className="text-xs text-ink-muted line-clamp-2">{notice.body_bn}</p>
                )}
                {notice.published_at && (
                  <p className="text-[10px] text-ink-faint mt-2" style={{ fontFamily: 'var(--font-latin)' }}>
                    {new Date(notice.published_at).toLocaleDateString('bn-BD')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          CTA Section
          ============================================================ */}
      <section className="container-wide py-16 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-ink mb-3">
            আপনার এলাকার মসজিদ যোগ করুন
          </h2>
          <p className="text-sm text-ink-muted mb-6">
            আপনার পরিচিত মসজিদের তথ্য দিয়ে এই ডিরেক্টরি আরও সমৃদ্ধ করুন।
            প্রতিটি তথ্য যাচাইয়ের পর প্রকাশিত হবে।
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/masjid/add" className="btn btn-primary btn-lg">
              মসজিদ যোগ করুন
            </Link>
            <Link href="/masjid" className="btn btn-secondary btn-lg">
              ডিরেক্টরি দেখুন
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function StatItem({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  return (
    <div className={`stat ${className}`}>
      <span className="stat-value" style={{ fontFamily: 'var(--font-latin)' }}>
        {value.toLocaleString('bn-BD')}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function VerifiedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-verified">
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
