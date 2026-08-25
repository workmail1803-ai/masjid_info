'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/auth/dal';

export async function approveSubmission(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await requireModerator();
  const id = formData.get('id') as string;
  if (!id) return { success: false, error: 'ID অনুপস্থিত।' };

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('masjid_submissions')
    .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Approve submission error:', error.message);
    return { success: false, error: 'অনুমোদন করা যায়নি।' };
  }

  revalidatePath('/admin/submissions');
  return { success: true };
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
