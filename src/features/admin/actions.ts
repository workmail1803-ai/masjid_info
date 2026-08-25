'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import slugify from 'slugify';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireModerator, getCurrentUser } from '@/lib/auth/dal';

/**
 * Platform-admin mosque creation.
 *
 * Previously this action used the service-role client (which bypasses RLS)
 * with no authentication check at all. Server Actions are reachable by POST
 * from outside the `/admin` path, so the proxy redirect was not protecting it.
 *
 * It now (a) requires a platform moderator, and (b) uses the *request-scoped*
 * client so RLS still applies as a second line of defence.
 */

const STRUCTURE_TYPES = [
  'small', 'medium', 'large', 'multi_storey',
  'tin_shed', 'semi_permanent', 'under_construction', 'unknown',
] as const;

const VERIFICATION_STATUSES = [
  'unverified', 'pending', 'verified', 'needs_review', 'rejected', 'archived',
] as const;

const PUBLISH_STATUSES = ['draft', 'published', 'archived'] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || null);

const createMasjidSchema = z.object({
  name_bn: z.string().trim().min(2, 'মসজিদের নাম আবশ্যক।').max(300),
  name_en: optionalText(300),
  division_id: z.coerce.number().int().positive('বিভাগ নির্বাচন করুন।'),
  district_id: z.coerce.number().int().positive('জেলা নির্বাচন করুন।'),
  upazila_id: z.coerce.number().int().positive().optional().nullable(),
  area_name_bn: optionalText(200),
  area_name_en: optionalText(200),
  address_bn: optionalText(500),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  structure_type: z.enum(STRUCTURE_TYPES).default('unknown'),
  established_year: z.coerce.number().int().min(600).max(2100).optional().nullable(),
  description_bn: optionalText(5000),
  contact_number: optionalText(20),
  email: z.string().email().optional().or(z.literal('')).transform((v) => v || null),
  status: z.enum(PUBLISH_STATUSES).default('draft'),
  verification_status: z.enum(VERIFICATION_STATUSES).default('unverified'),
});

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function createMasjidAdmin(
  formData: FormData
): Promise<{ success: boolean; error?: string; id?: string }> {
  // Authorization first — before reading a single field.
  const user = await requireModerator();

  const parsed = createMasjidSchema.safeParse({
    name_bn: formData.get('name_bn'),
    name_en: formData.get('name_en') ?? '',
    division_id: formData.get('division_id'),
    district_id: formData.get('district_id'),
    upazila_id: numberOrNull(formData.get('upazila_id')),
    area_name_bn: formData.get('area_name_bn') ?? '',
    area_name_en: formData.get('area_name_en') ?? '',
    address_bn: formData.get('address_bn') ?? '',
    latitude: numberOrNull(formData.get('latitude')),
    longitude: numberOrNull(formData.get('longitude')),
    structure_type: formData.get('structure_type') || 'unknown',
    established_year: numberOrNull(formData.get('established_year')),
    description_bn: formData.get('description_bn') ?? '',
    contact_number: formData.get('contact_number') ?? '',
    email: formData.get('email') ?? '',
    status: formData.get('status') || 'draft',
    verification_status: formData.get('verification_status') || 'unverified',
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  }

  const input = parsed.data;

  // slugify() returns '' for pure Bangla input, which would violate the NOT NULL
  // slug constraint and collide across rows. Fall back to the central code shape.
  const base = slugify(input.name_en || input.name_bn, { lower: true, strict: true });
  const slug = `${base || 'masjid'}-${Date.now().toString(36)}`;

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('masjids')
    .insert({
      name_bn: input.name_bn,
      name_en: input.name_en,
      slug,
      division_id: input.division_id,
      district_id: input.district_id,
      upazila_id: input.upazila_id ?? null,
      area_name_bn: input.area_name_bn,
      area_name_en: input.area_name_en,
      address_bn: input.address_bn,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      structure_type: input.structure_type,
      established_year: input.established_year ?? null,
      description_bn: input.description_bn,
      contact_number: input.contact_number,
      email: input.email,
      status: input.status,
      verification_status: input.verification_status,
      has_contact: Boolean(input.contact_number || input.email),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Admin create error:', error.message);
    return { success: false, error: 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' };
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'create',
    entity_type: 'masjid',
    entity_id: data.id,
    new_data: { name_bn: input.name_bn, status: input.status },
  });

  revalidatePath('/admin/masjids');
  revalidatePath('/masjid');

  return { success: true, id: data.id };
}

// ============================================================
// Mosque claim review (platform admin only)
// ============================================================

const reviewSchema = z.object({
  claim_id: z.string().uuid(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

async function reviewClaim(
  formData: FormData,
  rpc: 'approve_mosque_claim' | 'reject_mosque_claim'
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'লগইন প্রয়োজন।' };

  const parsed = reviewSchema.safeParse({
    claim_id: formData.get('claim_id'),
    notes: formData.get('notes') ?? '',
  });
  if (!parsed.success) return { success: false, error: 'তথ্য সঠিক নয়।' };

  const supabase = await createServerSupabaseClient();

  // The SQL function re-checks is_admin() itself and raises on failure, so the
  // authorization decision lives in the database, not only here.
  const { error } = await supabase.rpc(rpc, {
    p_claim_id: parsed.data.claim_id,
    p_notes: parsed.data.notes || null,
  });

  if (error) {
    console.error(`${rpc} failed:`, error.message);
    return {
      success: false,
      error: error.message.includes('insufficient_privilege') || error.code === '42501'
        ? 'এই কাজটি করার অনুমতি আপনার নেই।'
        : 'কাজটি সম্পন্ন করা যায়নি।',
    };
  }

  revalidatePath('/admin/claims');
  return { success: true };
}

export async function approveMosqueClaim(formData: FormData) {
  return reviewClaim(formData, 'approve_mosque_claim');
}

export async function rejectMosqueClaim(formData: FormData) {
  return reviewClaim(formData, 'reject_mosque_claim');
}
