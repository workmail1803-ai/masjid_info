'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import slugify from 'slugify';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/auth/dal';

/**
 * Platform content management — site-wide news, notices, Islamic topics and
 * resources. Distinct from a mosque's own announcements, which are scoped by
 * masjid_id and edited from the mosque dashboard.
 *
 * Every action calls requireModerator() first. The RLS policies on these
 * tables also require is_moderator_or_above(), so a crafted POST that skips
 * the UI still hits the same wall.
 */

export interface ActionState {
  error?: string;
  success?: string;
}

/** The four platform content tables and their title/body column names. */
export type ContentKind = 'news' | 'notices' | 'topics' | 'resources';

interface KindConfig {
  table: string;
  bodyColumn: string;
  excerptColumn?: string;
  publicPath: string;
  adminPath: string;
  label: string;
}

const KINDS: Record<ContentKind, KindConfig> = {
  news: {
    table: 'news_posts', bodyColumn: 'content_bn', excerptColumn: 'excerpt_bn',
    publicPath: '/news', adminPath: '/admin/news', label: 'সংবাদ',
  },
  notices: {
    table: 'notices', bodyColumn: 'body_bn',
    publicPath: '/notices', adminPath: '/admin/notices', label: 'নোটিশ',
  },
  topics: {
    table: 'islamic_topics', bodyColumn: 'content_bn',
    publicPath: '/topics', adminPath: '/admin/topics', label: 'বিষয়',
  },
  resources: {
    table: 'resources', bodyColumn: 'description_bn',
    publicPath: '/resources', adminPath: '/admin/resources', label: 'রিসোর্স',
  },
};

const optText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || null);

const contentSchema = z.object({
  kind: z.enum(['news', 'notices', 'topics', 'resources']),
  id: optText(64),
  title_bn: z.string().trim().min(2, 'শিরোনাম আবশ্যক।').max(300),
  title_en: optText(300),
  body: optText(50000),
  excerpt: optText(1000),
  author_name: optText(120),
  category_id: z.coerce.number().int().positive().optional().nullable(),
});

export async function saveContent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireModerator();

  const parsed = contentSchema.safeParse({
    kind: formData.get('kind'),
    id: formData.get('id') ?? '',
    title_bn: formData.get('title_bn'),
    title_en: formData.get('title_en') ?? '',
    body: formData.get('body') ?? '',
    excerpt: formData.get('excerpt') ?? '',
    author_name: formData.get('author_name') ?? '',
    category_id: formData.get('category_id') ? Number(formData.get('category_id')) : null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  }

  const { kind, id, title_bn, title_en, body, excerpt, author_name, category_id } = parsed.data;
  const cfg = KINDS[kind];
  const publish = formData.get('publish') === 'on';

  const row: Record<string, unknown> = {
    title_bn,
    title_en,
    [cfg.bodyColumn]: body,
    status: publish ? 'published' : 'draft',
    published_at: publish ? new Date().toISOString() : null,
  };

  if (cfg.excerptColumn) row[cfg.excerptColumn] = excerpt;
  if (kind === 'news') row.author_name = author_name;
  if (kind !== 'notices') row.category_id = category_id ?? null;
  if (kind === 'notices') row.is_featured = formData.get('is_featured') === 'on';

  const supabase = await createServerSupabaseClient();

  const { error } = id
    ? await supabase.from(cfg.table).update(row).eq('id', id)
    : await supabase.from(cfg.table).insert({
        ...row,
        // slugify() returns '' for Bangla-only input, which would violate the
        // NOT NULL slug constraint — fall back to the kind name.
        slug: `${slugify(title_en || title_bn, { lower: true, strict: true }) || kind}-${Date.now().toString(36)}`,
      });

  if (error) {
    console.error(`${cfg.table} save failed:`, error.message);
    return { error: 'সংরক্ষণ করা যায়নি।' };
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: id ? 'update' : 'create',
    entity_type: cfg.table,
    entity_id: id || null,
    new_data: { title_bn, status: row.status },
  });

  revalidatePath(cfg.publicPath);
  revalidatePath(cfg.adminPath);
  revalidatePath('/');

  return {
    success: publish ? `${cfg.label} প্রকাশিত হয়েছে।` : `${cfg.label} খসড়া সংরক্ষিত হয়েছে।`,
  };
}

const idSchema = z.object({
  kind: z.enum(['news', 'notices', 'topics', 'resources']),
  id: z.string().min(1),
});

/**
 * Publish/unpublish toggle. Kept separate from saveContent so a moderator can
 * pull something off the site immediately without reopening the editor.
 */
export async function toggleContentStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireModerator();

  const parsed = idSchema.safeParse({ kind: formData.get('kind'), id: formData.get('id') });
  if (!parsed.success) return { error: 'তথ্য সঠিক নয়।' };

  const cfg = KINDS[parsed.data.kind];
  const supabase = await createServerSupabaseClient();

  const { data: current } = await supabase
    .from(cfg.table).select('status').eq('id', parsed.data.id).maybeSingle();

  const nextStatus = current?.status === 'published' ? 'draft' : 'published';

  const { error } = await supabase
    .from(cfg.table)
    .update({
      status: nextStatus,
      published_at: nextStatus === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.id);

  if (error) return { error: 'পরিবর্তন করা যায়নি।' };

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: nextStatus === 'published' ? 'approve' : 'update',
    entity_type: cfg.table,
    entity_id: parsed.data.id,
    previous_data: { status: current?.status },
    new_data: { status: nextStatus },
  });

  revalidatePath(cfg.publicPath);
  revalidatePath(cfg.adminPath);
  return { success: nextStatus === 'published' ? 'প্রকাশিত হয়েছে।' : 'খসড়ায় নেওয়া হয়েছে।' };
}

export async function deleteContent(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireModerator();

  const parsed = idSchema.safeParse({ kind: formData.get('kind'), id: formData.get('id') });
  if (!parsed.success) return { error: 'তথ্য সঠিক নয়।' };

  const cfg = KINDS[parsed.data.kind];
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from(cfg.table).delete().eq('id', parsed.data.id);
  if (error) return { error: 'মুছে ফেলা যায়নি।' };

  await supabase.from('audit_logs').insert({
    user_id: user.id, action: 'delete', entity_type: cfg.table, entity_id: parsed.data.id,
  });

  revalidatePath(cfg.publicPath);
  revalidatePath(cfg.adminPath);
  return { success: 'মুছে ফেলা হয়েছে।' };
}
