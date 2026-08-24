import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import type { Masjid, MasjidSearchResult, MasjidWithGeo, MasjidImage, DirectoryFilters, MasjidMapPoint } from '@/types/database';
import { paginationConfig } from '@/config/site';

// ============================================================
// Search — uses the optimized search_masjids RPC function
// ============================================================
export async function searchMasjids(filters: DirectoryFilters): Promise<{
  results: MasjidSearchResult[];
  totalCount: number;
}> {
  const supabase = await createServerSupabaseClient();
  const limit = Math.min(filters.limit || paginationConfig.defaultPageSize, paginationConfig.maxPageSize);
  const offset = ((filters.page || 1) - 1) * limit;

  const { data, error } = await supabase.rpc('search_masjids', {
    p_query: filters.q || null,
    p_division_id: filters.division_id || null,
    p_district_id: filters.district_id || null,
    p_upazila_id: filters.upazila_id || null,
    p_structure_type: filters.structure_type || null,
    p_verification: filters.verification || null,
    p_has_image: filters.has_image ?? null,
    p_has_contact: filters.has_contact ?? null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Search error:', error);
    return { results: [], totalCount: 0 };
  }

  const results = (data || []) as MasjidSearchResult[];
  const totalCount = results.length > 0 ? Number(results[0].total_count) : 0;

  return { results, totalCount };
}

// ============================================================
// Get single masjid by slug — with geography joins
// ============================================================
export async function getMasjidBySlug(slug: string): Promise<MasjidWithGeo | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('masjids')
    .select(`
      *,
      division:divisions(*),
      district:districts(*),
      upazila:upazilas(*)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;
  return data as unknown as MasjidWithGeo;
}

// ============================================================
// Get masjid by central_code
// ============================================================
export async function getMasjidByCentralCode(code: string): Promise<Masjid | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('masjids')
    .select('*')
    .eq('central_code', code)
    .single();

  if (error || !data) return null;
  return data as Masjid;
}

// ============================================================
// Get masjid images
// ============================================================
export async function getMasjidImages(masjidId: string): Promise<MasjidImage[]> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('masjid_images')
    .select('*')
    .eq('masjid_id', masjidId)
    .eq('status', 'approved')
    .order('sort_order', { ascending: true });

  return (data || []) as MasjidImage[];
}

// ============================================================
// Get masjids for a district/upazila (location pages)
// ============================================================
export async function getMasjidsByDistrict(districtId: number, page = 1, limit = 20) {
  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('masjids')
    .select('id, central_code, slug, name_bn, name_en, area_name_bn, structure_type, verification_status, has_image', { count: 'exact' })
    .eq('district_id', districtId)
    .eq('status', 'published')
    .order('name_bn')
    .range(offset, offset + limit - 1);

  return {
    results: (data || []) as Partial<Masjid>[],
    totalCount: count || 0,
  };
}

export async function getMasjidsByUpazila(upazilaId: number, page = 1, limit = 20) {
  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('masjids')
    .select('id, central_code, slug, name_bn, name_en, area_name_bn, structure_type, verification_status, has_image', { count: 'exact' })
    .eq('upazila_id', upazilaId)
    .eq('status', 'published')
    .order('name_bn')
    .range(offset, offset + limit - 1);

  return {
    results: (data || []) as Partial<Masjid>[],
    totalCount: count || 0,
  };
}

// ============================================================
// Map bounds query
// ============================================================
export async function getMasjidsInBounds(
  minLat: number, minLng: number, maxLat: number, maxLng: number
): Promise<MasjidMapPoint[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_masjids_in_bounds', {
    p_min_lat: minLat,
    p_min_lng: minLng,
    p_max_lat: maxLat,
    p_max_lng: maxLng,
    p_limit: 2000,
  });

  if (error) return [];
  return (data || []) as MasjidMapPoint[];
}

// ============================================================
// Recently added / verified (homepage)
// ============================================================
export async function getRecentMasjids(limit = 6) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('masjids')
    .select('id, slug, name_bn, name_en, area_name_bn, district_id, verification_status')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as Partial<Masjid>[];
}

export async function getRecentlyVerified(limit = 6) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('masjids')
    .select('id, slug, name_bn, name_en, area_name_bn, district_id, verification_status')
    .eq('status', 'published')
    .eq('verification_status', 'verified')
    .order('verified_at', { ascending: false })
    .limit(limit);

  return (data || []) as Partial<Masjid>[];
}
