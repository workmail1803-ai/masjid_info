import { NextResponse } from 'next/server';
import { searchMasjids } from '@/lib/services/masjid.service';
import type { DirectoryFilters } from '@/types/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: DirectoryFilters = {
    q: searchParams.get('q') || undefined,
    division_id: searchParams.get('division_id') ? Number(searchParams.get('division_id')) : undefined,
    district_id: searchParams.get('district_id') ? Number(searchParams.get('district_id')) : undefined,
    upazila_id: searchParams.get('upazila_id') ? Number(searchParams.get('upazila_id')) : undefined,
    structure_type: (searchParams.get('structure_type') as DirectoryFilters['structure_type']) || undefined,
    verification: (searchParams.get('verification') as DirectoryFilters['verification']) || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
  };

  const { results, totalCount } = await searchMasjids(filters);

  return NextResponse.json({
    results,
    totalCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / (filters.limit || 20)),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
