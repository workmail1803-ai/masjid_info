import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Division, District, Upazila } from '@/types/database';

// All divisions (8 rows — safe to cache aggressively)
export async function getDivisions(): Promise<Division[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('divisions')
    .select('*')
    .order('sort_order');
  return (data || []) as Division[];
}

// All districts (64 rows)
export async function getDistricts(): Promise<District[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('districts')
    .select('*')
    .order('sort_order');
  return (data || []) as District[];
}

// Districts by division
export async function getDistrictsByDivision(divisionId: number): Promise<District[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('districts')
    .select('*')
    .eq('division_id', divisionId)
    .order('sort_order');
  return (data || []) as District[];
}

// Upazilas by district
export async function getUpazilasByDistrict(districtId: number): Promise<Upazila[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('upazilas')
    .select('*')
    .eq('district_id', districtId)
    .order('sort_order');
  return (data || []) as Upazila[];
}

// Single geography by slug
export async function getDivisionBySlug(slug: string): Promise<Division | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('divisions')
    .select('*')
    .eq('slug', slug)
    .single();
  return data as Division | null;
}

export async function getDistrictBySlug(slug: string): Promise<District | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('districts')
    .select('*, division:divisions(*)')
    .eq('slug', slug)
    .single();
  return data as (District & { division: Division }) | null;
}

export async function getUpazilaBySlug(slug: string): Promise<(Upazila & { district: District & { division: Division } }) | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('upazilas')
    .select('*, district:districts(*, division:divisions(*))')
    .eq('slug', slug)
    .single();
  return data as (Upazila & { district: District & { division: Division } }) | null;
}

// Count masjids per district (for location pages)
export async function getMasjidCountByDistrict(districtId: number): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from('masjids')
    .select('id', { count: 'exact', head: true })
    .eq('district_id', districtId)
    .eq('status', 'published');
  return count || 0;
}
