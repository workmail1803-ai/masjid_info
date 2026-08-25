'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import slugify from 'slugify';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { assertMosqueCapability, AuthorizationError, getCurrentUser } from '@/lib/auth/dal';
import type { MosqueCapability } from '@/types/mosque-admin';

/**
 * Mosque self-service editing — everything publicly visible on a mosque page.
 *
 * Every action authorizes against the database via assertMosqueCapability()
 * before touching a row, and the RLS policy on each table re-checks the same
 * capability. Server Actions are POST-reachable from any route, so the hidden
 * nav is never the boundary.
 */

export interface ActionState {
  error?: string;
  success?: string;
}

const ok = (success: string): ActionState => ({ success });
const fail = (error: string): ActionState => ({ error });

async function guard(
  masjidId: string,
  capability: MosqueCapability,
  run: () => Promise<ActionState>
): Promise<ActionState> {
  if (!masjidId) return fail('মসজিদ শনাক্ত করা যায়নি।');
  try {
    await assertMosqueCapability(masjidId, capability);
    return await run();
  } catch (err) {
    if (err instanceof AuthorizationError) return fail(err.message);
    console.error('Mosque action failed:', err);
    return fail('কাজটি সম্পন্ন করা যায়নি।');
  }
}

const optText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || null);
const optTime = z
  .string().trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'সময় সঠিক নয়।')
  .optional().or(z.literal('')).transform((v) => v || null);
const optDate = z
  .string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional().or(z.literal('')).transform((v) => v || null);
const checkbox = (fd: FormData, name: string) => fd.get(name) === 'on' || fd.get(name) === 'true';

function uniqueSlug(source: string, fallback: string) {
  const base = slugify(source || fallback, { lower: true, strict: true });
  return `${base || fallback}-${Date.now().toString(36)}`;
}

/** Records a field-level change so it shows in the public update history. */
async function logChange(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  masjidId: string,
  action: 'create' | 'update' | 'delete',
  field: string
) {
  const user = await getCurrentUser();
  await supabase.from('masjid_change_history').insert({
    masjid_id: masjidId,
    changed_by: user?.id ?? null,
    action,
    field_name: field,
  });
}

function revalidateMosque(masjidId: string, slug?: string | null) {
  revalidatePath(`/dashboard/mosque/${masjidId}`, 'layout');
  if (slug) revalidatePath(`/masjid/${slug}`);
  revalidatePath('/masjid');
}

// ============================================================
// Profile & facilities
// ============================================================
const profileSchema = z.object({
  name_bn: z.string().trim().min(2, 'মসজিদের নাম আবশ্যক।').max(300),
  name_en: optText(300),
  area_name_bn: optText(200),
  address_bn: optText(500),
  description_bn: optText(5000),
  history_bn: optText(5000),
  established_year: z.coerce.number().int().min(600).max(2100).optional().nullable(),
  capacity: z.coerce.number().int().min(0).max(1000000).optional().nullable(),
  floors: z.coerce.number().int().min(0).max(50).optional().nullable(),
  official_phone: optText(20),
  official_email: z.string().email('ইমেইল সঠিক নয়।').optional().or(z.literal('')).transform((v) => v || null),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  structure_type: z.enum([
    'small', 'medium', 'large', 'multi_storey',
    'tin_shed', 'semi_permanent', 'under_construction', 'unknown',
  ]),
});

const num = (v: FormDataEntryValue | null) => {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function updateMosqueProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');

  return guard(masjidId, 'manage_profile', async () => {
    const parsed = profileSchema.safeParse({
      name_bn: formData.get('name_bn'),
      name_en: formData.get('name_en') ?? '',
      area_name_bn: formData.get('area_name_bn') ?? '',
      address_bn: formData.get('address_bn') ?? '',
      description_bn: formData.get('description_bn') ?? '',
      history_bn: formData.get('history_bn') ?? '',
      established_year: num(formData.get('established_year')),
      capacity: num(formData.get('capacity')),
      floors: num(formData.get('floors')),
      official_phone: formData.get('official_phone') ?? '',
      official_email: formData.get('official_email') ?? '',
      latitude: num(formData.get('latitude')),
      longitude: num(formData.get('longitude')),
      structure_type: formData.get('structure_type') || 'unknown',
    });

    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('masjids')
      .update({
        ...parsed.data,
        // Facilities are checkboxes: absent means false, never "leave alone".
        has_women_prayer_area: checkbox(formData, 'has_women_prayer_area'),
        has_wudu_facility: checkbox(formData, 'has_wudu_facility'),
        has_toilet: checkbox(formData, 'has_toilet'),
        has_parking: checkbox(formData, 'has_parking'),
        is_wheelchair_accessible: checkbox(formData, 'is_wheelchair_accessible'),
        has_ac: checkbox(formData, 'has_ac'),
        has_library: checkbox(formData, 'has_library'),
        has_contact: Boolean(parsed.data.official_phone || parsed.data.official_email),
      })
      .eq('id', masjidId)
      .select('slug')
      .single();

    if (error) {
      console.error('Profile update failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    await logChange(supabase, masjidId, 'update', 'profile');
    revalidateMosque(masjidId, data?.slug);
    return ok('প্রোফাইল হালনাগাদ হয়েছে।');
  });
}

// ============================================================
// Prayer times
// ============================================================
const prayerSchema = z.object({
  kind: z.enum(['daily', 'ramadan', 'eid']),
  fajr: optTime, sunrise: optTime, dhuhr: optTime, asr: optTime,
  maghrib: optTime, isha: optTime, jumuah: optTime, jumuah_khutbah: optTime,
  taraweeh: optTime, sehri_end: optTime, iftar: optTime,
  eid_jamaat_1: optTime, eid_jamaat_2: optTime,
  eid_note_bn: optText(500),
  note_bn: optText(500),
});

export async function savePrayerTimes(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');

  return guard(masjidId, 'manage_prayer_times', async () => {
    const raw: Record<string, unknown> = { kind: formData.get('kind') || 'daily' };
    for (const f of [
      'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah', 'jumuah_khutbah',
      'taraweeh', 'sehri_end', 'iftar', 'eid_jamaat_1', 'eid_jamaat_2',
    ]) raw[f] = formData.get(f) ?? '';
    raw.eid_note_bn = formData.get('eid_note_bn') ?? '';
    raw.note_bn = formData.get('note_bn') ?? '';

    const parsed = prayerSchema.safeParse(raw);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'সময় সঠিক নয়।');

    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    // One row per (mosque, kind) — upsert so editing replaces rather than stacks.
    const { error } = await supabase
      .from('prayer_times')
      .upsert(
        { masjid_id: masjidId, ...parsed.data, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'masjid_id,kind' }
      );

    if (error) {
      console.error('Prayer times save failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    await logChange(supabase, masjidId, 'update', 'prayer_times');
    revalidateMosque(masjidId);
    return ok('নামাজের সময়সূচি হালনাগাদ হয়েছে।');
  });
}

// ============================================================
// Staff
// ============================================================
const staffSchema = z.object({
  name_bn: z.string().trim().min(2, 'নাম আবশ্যক।').max(200),
  name_en: optText(200),
  position: z.enum(['imam', 'assistant_imam', 'muazzin', 'khadem', 'teacher', 'security', 'other']),
  position_label_bn: optText(100),
  qualifications_bn: optText(1000),
  serving_since: optDate,
  bio_bn: optText(2000),
  private_phone: optText(20),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const staffId = String(formData.get('staff_id') ?? '');

  return guard(masjidId, 'manage_staff', async () => {
    const parsed = staffSchema.safeParse({
      name_bn: formData.get('name_bn'),
      name_en: formData.get('name_en') ?? '',
      position: formData.get('position') || 'imam',
      position_label_bn: formData.get('position_label_bn') ?? '',
      qualifications_bn: formData.get('qualifications_bn') ?? '',
      serving_since: formData.get('serving_since') ?? '',
      bio_bn: formData.get('bio_bn') ?? '',
      private_phone: formData.get('private_phone') ?? '',
      sort_order: formData.get('sort_order') || 0,
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const languages = String(formData.get('languages') ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    const row = {
      masjid_id: masjidId,
      ...parsed.data,
      languages: languages.length ? languages : null,
      // Personal numbers stay private unless the person explicitly consents.
      contact_consent_public: checkbox(formData, 'contact_consent_public'),
      is_active: !checkbox(formData, 'inactive'),
    };

    const supabase = await createServerSupabaseClient();
    const { error } = staffId
      ? await supabase.from('mosque_staff').update(row).eq('id', staffId).eq('masjid_id', masjidId)
      : await supabase.from('mosque_staff').insert(row);

    if (error) {
      console.error('Staff save failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    await logChange(supabase, masjidId, staffId ? 'update' : 'create', 'staff');
    revalidateMosque(masjidId);
    return ok(staffId ? 'তথ্য হালনাগাদ হয়েছে।' : 'যুক্ত করা হয়েছে।');
  });
}

export async function deleteStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const staffId = String(formData.get('staff_id') ?? '');

  return guard(masjidId, 'manage_staff', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('mosque_staff').delete().eq('id', staffId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি।');
    await logChange(supabase, masjidId, 'delete', 'staff');
    revalidateMosque(masjidId);
    return ok('মুছে ফেলা হয়েছে।');
  });
}

// ============================================================
// Committee
// ============================================================
const committeeSchema = z.object({
  name_bn: z.string().trim().min(2, 'নাম আবশ্যক।').max(200),
  name_en: optText(200),
  role_label_bn: z.string().trim().min(1, 'পদ আবশ্যক।').max(100),
  term_start: optDate,
  term_end: optDate,
  formation_date: optDate,
  private_phone: optText(20),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveCommitteeMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const memberId = String(formData.get('member_id') ?? '');

  return guard(masjidId, 'manage_committee', async () => {
    const parsed = committeeSchema.safeParse({
      name_bn: formData.get('name_bn'),
      name_en: formData.get('name_en') ?? '',
      role_label_bn: formData.get('role_label_bn'),
      term_start: formData.get('term_start') ?? '',
      term_end: formData.get('term_end') ?? '',
      formation_date: formData.get('formation_date') ?? '',
      private_phone: formData.get('private_phone') ?? '',
      sort_order: formData.get('sort_order') || 0,
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const row = {
      masjid_id: masjidId,
      ...parsed.data,
      contact_consent_public: checkbox(formData, 'contact_consent_public'),
      is_active: !checkbox(formData, 'inactive'),
    };

    const supabase = await createServerSupabaseClient();
    const { error } = memberId
      ? await supabase.from('mosque_committee_members').update(row).eq('id', memberId).eq('masjid_id', masjidId)
      : await supabase.from('mosque_committee_members').insert(row);

    if (error) {
      console.error('Committee save failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    await logChange(supabase, masjidId, memberId ? 'update' : 'create', 'committee');
    revalidateMosque(masjidId);
    return ok(memberId ? 'হালনাগাদ হয়েছে।' : 'যুক্ত করা হয়েছে।');
  });
}

export async function deleteCommitteeMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const memberId = String(formData.get('member_id') ?? '');

  return guard(masjidId, 'manage_committee', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('mosque_committee_members').delete().eq('id', memberId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি।');
    await logChange(supabase, masjidId, 'delete', 'committee');
    revalidateMosque(masjidId);
    return ok('মুছে ফেলা হয়েছে।');
  });
}

// ============================================================
// Community services
// ============================================================
const serviceSchema = z.object({
  title_bn: z.string().trim().min(2, 'সেবার নাম আবশ্যক।').max(200),
  title_en: optText(200),
  description_bn: optText(1000),
  icon: optText(8),
  contact_note_bn: optText(300),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const serviceId = String(formData.get('service_id') ?? '');

  return guard(masjidId, 'manage_services', async () => {
    const parsed = serviceSchema.safeParse({
      title_bn: formData.get('title_bn'),
      title_en: formData.get('title_en') ?? '',
      description_bn: formData.get('description_bn') ?? '',
      icon: formData.get('icon') ?? '',
      contact_note_bn: formData.get('contact_note_bn') ?? '',
      sort_order: formData.get('sort_order') || 0,
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const row = { masjid_id: masjidId, ...parsed.data, is_active: !checkbox(formData, 'inactive') };

    const supabase = await createServerSupabaseClient();
    const { error } = serviceId
      ? await supabase.from('community_services').update(row).eq('id', serviceId).eq('masjid_id', masjidId)
      : await supabase.from('community_services').insert(row);

    if (error) return fail('সংরক্ষণ করা যায়নি।');
    await logChange(supabase, masjidId, serviceId ? 'update' : 'create', 'services');
    revalidateMosque(masjidId);
    return ok(serviceId ? 'হালনাগাদ হয়েছে।' : 'যুক্ত করা হয়েছে।');
  });
}

export async function deleteService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const serviceId = String(formData.get('service_id') ?? '');

  return guard(masjidId, 'manage_services', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('community_services').delete().eq('id', serviceId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি।');
    revalidateMosque(masjidId);
    return ok('মুছে ফেলা হয়েছে।');
  });
}

// ============================================================
// Announcements (mosque-scoped notices)
// ============================================================
const announcementSchema = z.object({
  title_bn: z.string().trim().min(2, 'শিরোনাম আবশ্যক।').max(300),
  title_en: optText(300),
  body_bn: optText(10000),
  expires_at: optDate,
});

export async function saveAnnouncement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const noticeId = String(formData.get('notice_id') ?? '');

  return guard(masjidId, 'manage_announcements', async () => {
    const parsed = announcementSchema.safeParse({
      title_bn: formData.get('title_bn'),
      title_en: formData.get('title_en') ?? '',
      body_bn: formData.get('body_bn') ?? '',
      expires_at: formData.get('expires_at') ?? '',
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const publish = checkbox(formData, 'publish');
    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    const base = {
      masjid_id: masjidId,
      title_bn: parsed.data.title_bn,
      title_en: parsed.data.title_en,
      body_bn: parsed.data.body_bn,
      expires_at: parsed.data.expires_at ? `${parsed.data.expires_at}T23:59:59Z` : null,
      is_featured: checkbox(formData, 'is_featured'),
      is_urgent: checkbox(formData, 'is_urgent'),
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null,
      created_by: user?.id ?? null,
    };

    const { error } = noticeId
      ? await supabase.from('notices').update(base).eq('id', noticeId).eq('masjid_id', masjidId)
      : await supabase.from('notices').insert({
          ...base,
          slug: uniqueSlug(parsed.data.title_en || parsed.data.title_bn, 'notice'),
        });

    if (error) {
      console.error('Announcement save failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    await logChange(supabase, masjidId, noticeId ? 'update' : 'create', 'announcement');
    revalidateMosque(masjidId);
    revalidatePath('/notices');
    return ok(publish ? 'ঘোষণা প্রকাশিত হয়েছে।' : 'খসড়া সংরক্ষিত হয়েছে।');
  });
}

export async function deleteAnnouncement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const noticeId = String(formData.get('notice_id') ?? '');

  return guard(masjidId, 'manage_announcements', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('notices').delete().eq('id', noticeId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি।');
    revalidateMosque(masjidId);
    revalidatePath('/notices');
    return ok('মুছে ফেলা হয়েছে।');
  });
}

// ============================================================
// Events (mosque-scoped activities)
// ============================================================
const eventSchema = z.object({
  title_bn: z.string().trim().min(2, 'শিরোনাম আবশ্যক।').max(300),
  title_en: optText(300),
  description_bn: optText(5000),
  speaker_bn: optText(200),
  event_date: optDate,
  start_time: optTime,
  end_time: optTime,
  location_bn: optText(300),
  contact_note_bn: optText(300),
});

export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const eventId = String(formData.get('event_id') ?? '');

  return guard(masjidId, 'manage_events', async () => {
    const parsed = eventSchema.safeParse({
      title_bn: formData.get('title_bn'),
      title_en: formData.get('title_en') ?? '',
      description_bn: formData.get('description_bn') ?? '',
      speaker_bn: formData.get('speaker_bn') ?? '',
      event_date: formData.get('event_date') ?? '',
      start_time: formData.get('start_time') ?? '',
      end_time: formData.get('end_time') ?? '',
      location_bn: formData.get('location_bn') ?? '',
      contact_note_bn: formData.get('contact_note_bn') ?? '',
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const publish = checkbox(formData, 'publish');
    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    const base = {
      masjid_id: masjidId,
      ...parsed.data,
      requires_registration: checkbox(formData, 'requires_registration'),
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null,
      created_by: user?.id ?? null,
    };

    const { error } = eventId
      ? await supabase.from('activities').update(base).eq('id', eventId).eq('masjid_id', masjidId)
      : await supabase.from('activities').insert({
          ...base,
          slug: uniqueSlug(parsed.data.title_en || parsed.data.title_bn, 'event'),
        });

    if (error) {
      console.error('Event save failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    await logChange(supabase, masjidId, eventId ? 'update' : 'create', 'event');
    revalidateMosque(masjidId);
    revalidatePath('/activities');
    return ok(publish ? 'কার্যক্রম প্রকাশিত হয়েছে।' : 'খসড়া সংরক্ষিত হয়েছে।');
  });
}

export async function deleteEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const eventId = String(formData.get('event_id') ?? '');

  return guard(masjidId, 'manage_events', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('activities').delete().eq('id', eventId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি।');
    revalidateMosque(masjidId);
    revalidatePath('/activities');
    return ok('মুছে ফেলা হয়েছে।');
  });
}
