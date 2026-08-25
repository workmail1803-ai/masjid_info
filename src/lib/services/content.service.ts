import { createStaticSupabaseClient } from '@/lib/supabase/static';
import type { Notice, NewsPost, IslamicTopic, Resource, Activity } from '@/types/database';

// ============================================================
// Notices
// ============================================================
export async function getPublishedNotices(page = 1, limit = 10) {
  const supabase = createStaticSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from('notices')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { results: (data || []) as Notice[], totalCount: count || 0 };
}

export async function getNoticeBySlug(slug: string): Promise<Notice | null> {
  const supabase = createStaticSupabaseClient();
  const { data } = await supabase
    .from('notices')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return data as Notice | null;
}

export async function getFeaturedNotices(limit = 3): Promise<Notice[]> {
  const supabase = createStaticSupabaseClient();
  const { data } = await supabase
    .from('notices')
    .select('*')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data || []) as Notice[];
}

// ============================================================
// News
// ============================================================
export async function getPublishedNews(page = 1, limit = 10) {
  const supabase = createStaticSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from('news_posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { results: (data || []) as NewsPost[], totalCount: count || 0 };
}

export async function getNewsBySlug(slug: string): Promise<NewsPost | null> {
  const supabase = createStaticSupabaseClient();
  const { data } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return data as NewsPost | null;
}

// ============================================================
// Topics
// ============================================================
export async function getPublishedTopics(page = 1, limit = 12) {
  const supabase = createStaticSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from('islamic_topics')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { results: (data || []) as IslamicTopic[], totalCount: count || 0 };
}

export async function getTopicBySlug(slug: string): Promise<IslamicTopic | null> {
  const supabase = createStaticSupabaseClient();
  const { data } = await supabase
    .from('islamic_topics')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return data as IslamicTopic | null;
}

// ============================================================
// Resources
// ============================================================
export async function getPublishedResources(page = 1, limit = 12) {
  const supabase = createStaticSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from('resources')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { results: (data || []) as Resource[], totalCount: count || 0 };
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const supabase = createStaticSupabaseClient();
  const { data } = await supabase
    .from('resources')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return data as Resource | null;
}

// ============================================================
// Activities
// ============================================================
export async function getUpcomingActivities(limit = 5): Promise<Activity[]> {
  const supabase = createStaticSupabaseClient();
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('status', 'published')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .limit(limit);
  return (data || []) as Activity[];
}

export async function getPublishedActivities(page = 1, limit = 12) {
  const supabase = createStaticSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('event_date', { ascending: false })
    .range(offset, offset + limit - 1);

  return { results: (data || []) as Activity[], totalCount: count || 0 };
}

export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  const supabase = createStaticSupabaseClient();
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return data as Activity | null;
}
