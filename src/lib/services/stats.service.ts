import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DirectoryStats } from '@/types/database';

export async function getDirectoryStats(): Promise<DirectoryStats> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_directory_stats');

  if (error || !data || data.length === 0) {
    return {
      total_masjids: 0,
      verified_masjids: 0,
      districts_covered: 0,
      upazilas_covered: 0,
      recently_added: 0,
      pending_submissions: 0,
    };
  }

  return data[0] as DirectoryStats;
}
