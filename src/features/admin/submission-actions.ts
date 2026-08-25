'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/auth/dal';
import slugify from 'slugify';

/**
 * Approving a submission creates the real mosque record, carries the
 * submitted photos across, and links the two rows.
 *
 * Previously this only flipped a status flag, so an approved submission
 * produced no mosque and its uploaded photos were stranded in storage.
 */
export async function approveSubmission(
  formData: FormData
): Promise<{ success: boolean; error?: string; masjidId?: string }> {
  const user = await requireModerator();
  const id = formData.get('id') as string;
  if (!id) return { success: false, error: 'ID অনুপস্থিত।' };

  const supabase = await createServerSupabaseClient();

  const { data: s, error: readError } = await supabase
    .from('masjid_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (readError || !s) {
    console.error('Approve: submission not found:', readError?.message);
    return { success: false, error: 'জমাটি পাওয়া যায়নি।' };
  }

  if (s.status !== 'pending_review') {
    return { success: false, error: 'এই জমাটি ইতিমধ্যে পর্যালোচিত হয়েছে।' };
  }
  if (!s.division_id || !s.district_id) {
    return { success: false, error: 'বিভাগ ও জেলা ছাড়া অনুমোদন করা যায় না।' };
  }

  // slugify() yields '' for pure Bangla input, so fall back to a stable prefix.
  const base = slugify(s.name_en || s.name_bn, { lower: true, strict: true });
  const slug = `${base || 'masjid'}-${Date.now().toString(36)}`;

  const { data: masjid, error: insertError } = await supabase
    .from('masjids')
    .insert({
      name_bn: s.name_bn,
      name_en: s.name_en,
      slug,
      division_id: s.division_id,
      district_id: s.district_id,
      upazila_id: s.upazila_id,
      area_name_bn: s.area_name_bn,
      address_bn: s.address_bn,
      latitude: s.latitude,
      longitude: s.longitude,
      structure_type: s.structure_type ?? 'unknown',
      established_year: s.established_year,
      description_bn: s.description_bn,
      contact_number: s.contact_number,
      email: s.email,
      has_contact: Boolean(s.contact_number || s.email),
      has_image: (s.image_paths?.length ?? 0) > 0,
      // Community-sourced, so it starts unverified. A moderator promotes it
      // separately — approval of a submission is not identity verification.
      verification_status: 'unverified',
      status: 'published',
      source_type: 'public_submission',
      source_record_id: s.id,
    })
    .select('id')
    .single();

  if (insertError || !masjid) {
    console.error('Approve: masjid insert failed:', insertError?.message);
    return { success: false, error: 'মসজিদ তৈরি করা যায়নি।' };
  }

  // Carry the submitted photos over. They stay in the `submissions` bucket —
  // the public URL is stable, so copying bytes would only duplicate storage.
  const paths: string[] = s.image_paths ?? [];
  if (paths.length > 0) {
    const rows = paths.map((path, i) => {
      const url = supabase.storage.from('submissions').getPublicUrl(path).data.publicUrl;
      return {
        masjid_id: masjid.id,
        source_type: 'user_submission' as const,
        source_url: url,
        storage_path: url,
        thumbnail_path: url,
        card_path: url,
        detail_path: url,
        // The reviewer sees every photo on the review page before clicking
        // approve, so the human check has already happened. Leaving these
        // 'pending' meant an approved mosque showed a placeholder instead of
        // the photo its submitter provided.
        status: 'approved' as const,
        is_primary: i === 0,
        sort_order: i,
      };
    });

    const { error: imageError } = await supabase.from('masjid_images').insert(rows);
    if (imageError) {
      // The mosque exists; a failed image copy should not undo the approval.
      console.error('Approve: image carry-over failed:', imageError.message);
    }
  }

  const { error } = await supabase
    .from('masjid_submissions')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      merged_with_masjid_id: masjid.id,
    })
    .eq('id', id);

  if (error) {
    console.error('Approve submission error:', error.message);
    return { success: false, error: 'অনুমোদন করা যায়নি।' };
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'approve',
    entity_type: 'masjid_submission',
    entity_id: id,
    new_data: { masjid_id: masjid.id, images_carried: paths.length },
  });

  revalidatePath('/admin/submissions');
  revalidatePath('/masjid');
  return { success: true, masjidId: masjid.id };
}

export async function rejectSubmission(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await requireModerator();
  const id = formData.get('id') as string;
  const notes = (formData.get('notes') as string) || null;
  if (!id) return { success: false, error: 'ID অনুপস্থিত।' };

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('masjid_submissions')
    .update({
      status: 'rejected',
      admin_notes: notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Reject submission error:', error.message);
    return { success: false, error: 'প্রত্যাখ্যান করা যায়নি।' };
  }

  revalidatePath('/admin/submissions');
  return { success: true };
}

export async function updateMasjidAdmin(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await requireModerator();
  const id = formData.get('id') as string;
  if (!id) return { success: false, error: 'ID অনুপস্থিত।' };

  const supabase = await createServerSupabaseClient();

  const updates: Record<string, unknown> = {};
  const fields = [
    'name_bn', 'name_en', 'address_bn', 'area_name_bn',
    'contact_number', 'email', 'description_bn',
    'structure_type', 'verification_status', 'status',
  ];

  for (const field of fields) {
    const val = formData.get(field);
    if (val !== null) {
      updates[field] = val === '' ? null : val;
    }
  }

  // Numeric fields
  for (const field of ['established_year', 'latitude', 'longitude', 'division_id', 'district_id', 'upazila_id']) {
    const val = formData.get(field);
    if (val !== null && val !== '') {
      updates[field] = Number(val);
    } else if (val === '') {
      updates[field] = null;
    }
  }

  updates.has_contact = Boolean(updates.contact_number || updates.email);

  const { error } = await supabase
    .from('masjids')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Update masjid error:', error.message);
    return { success: false, error: 'সংরক্ষণ করা যায়নি।' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'update',
    entity_type: 'masjid',
    entity_id: id,
    new_data: updates,
  });

  revalidatePath('/admin/masjids');
  revalidatePath(`/masjid`);
  return { success: true };
}
