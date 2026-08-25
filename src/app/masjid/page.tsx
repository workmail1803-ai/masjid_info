import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { searchMasjids } from '@/lib/services/masjid.service';
import { getDivisions, getDistricts } from '@/lib/services/geography.service';
import { DirectorySearch } from '@/features/directory/DirectorySearch';
import { DirectoryResults } from '@/features/directory/DirectoryResults';
import type { DirectoryFilters } from '@/types/database';

export const metadata: Metadata = {
  title: 'মসজিদ ডিরেক্টরি',
  description: 'বাংলাদেশের সকল মসজিদের ডিরেক্টরি। বিভাগ, জেলা, উপজেলা অনুসারে খুঁজুন।',
};

// Cache search results for 60 seconds — stale-while-revalidate ensures the
// next visitor after expiry still gets the cached version instantly while
// Vercel re-renders in the background.
export const revalidate = 60;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: DirectoryFilters = {
    q: typeof params.q === 'string' ? params.q : undefined,
    division_id: params.division_id ? Number(params.division_id) : undefined,
    district_id: params.district_id ? Number(params.district_id) : undefined,
    upazila_id: params.upazila_id ? Number(params.upazila_id) : undefined,
    structure_type: params.structure_type as DirectoryFilters['structure_type'],
    verification: params.verification as DirectoryFilters['verification'],
    has_image: params.has_image === 'true' ? true : params.has_image === 'false' ? false : undefined,
    has_contact: params.has_contact === 'true' ? true : params.has_contact === 'false' ? false : undefined,
    page: params.page ? Number(params.page) : 1,
  };

  // Parallel data fetching
  const [{ results, totalCount }, divisions, districts] = await Promise.all([
    searchMasjids(filters),
    getDivisions(),
    getDistricts(),
  ]);

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="container-wide py-6 md:py-8">
      {/* Breadcrumbs */}
      <nav className="text-xs text-ink-muted mb-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><Link href="/" className="hover:text-accent">হোম</Link></li>
          <li>/</li>
          <li className="text-ink">মসজিদ ডিরেক্টরি</li>
        </ol>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:w-72 shrink-0">
          <Suspense fallback={<div className="h-96 skeleton rounded-lg" />}>
            <DirectorySearch
              divisions={divisions}
              districts={districts}
              currentFilters={filters}
            />
          </Suspense>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-muted">
              {totalCount > 0 ? (
                <>
                  <span className="font-semibold text-ink" style={{ fontFamily: 'var(--font-latin)' }}>
                    {totalCount.toLocaleString('bn-BD')}
                  </span>{' '}
                  টি মসজিদ পাওয়া গেছে
                </>
              ) : (
                'কোনো মসজিদ পাওয়া যায়নি'
              )}
            </p>
          </div>

          {/* Results list */}
          {results.length > 0 ? (
            <DirectoryResults results={results} />
          ) : (
            <EmptyDirectoryState query={filters.q} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <DirectoryPagination
              currentPage={filters.page || 1}
              totalPages={totalPages}
              filters={filters}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyDirectoryState({ query }: { query?: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-muted">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <p className="text-ink-light mb-2">
        {query
          ? `"${query}" এর জন্য কোনো মসজিদ পাওয়া যায়নি।`
          : 'এই এলাকায় এখনো কোনো মসজিদের তথ্য পাওয়া যায়নি।'
        }
      </p>
      <Link href="/masjid/add" className="btn btn-secondary btn-sm mt-4">
        একটি মসজিদ যোগ করুন
      </Link>
    </div>
  );
}

function DirectoryPagination({
  currentPage,
  totalPages,
  filters,
}: {
  currentPage: number;
  totalPages: number;
  filters: DirectoryFilters;
}) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.division_id) params.set('division_id', String(filters.division_id));
    if (filters.district_id) params.set('district_id', String(filters.district_id));
    if (filters.upazila_id) params.set('upazila_id', String(filters.upazila_id));
    if (filters.structure_type) params.set('structure_type', filters.structure_type);
    if (filters.verification) params.set('verification', filters.verification);
    if (page > 1) params.set('page', String(page));
    return `/masjid?${params.toString()}`;
  };

  // Show max 5 pages around current
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="পৃষ্ঠা নেভিগেশন">
      {currentPage > 1 && (
        <Link href={buildUrl(currentPage - 1)} className="btn btn-ghost btn-sm">← আগের</Link>
      )}
      {pages.map((page) => (
        <Link
          key={page}
          href={buildUrl(page)}
          className={`btn btn-sm min-w-[2.5rem] ${page === currentPage ? 'btn-primary' : 'btn-ghost'}`}
          aria-current={page === currentPage ? 'page' : undefined}
          style={{ fontFamily: 'var(--font-latin)' }}
        >
          {page}
        </Link>
      ))}
      {currentPage < totalPages && (
        <Link href={buildUrl(currentPage + 1)} className="btn btn-ghost btn-sm">পরের →</Link>
      )}
    </nav>
  );
}
