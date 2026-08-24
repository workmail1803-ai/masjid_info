'use server';

import { createAdminClient } from '@/lib/supabase/server';
import slugify from 'slugify';

export async function createMasjidAdmin(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const name_bn = formData.get('name_bn') as string;
    const name_en = formData.get('name_en') as string;
    const division_id = Number(formData.get('division_id'));
    const district_id = Number(formData.get('district_id'));

    if (!name_bn || !division_id || !district_id) {
      return { success: false, error: 'নাম, বিভাগ, ও জেলা আবশ্যক' };
    }

    // Generate slug
    const baseSlug = slugify(name_en || name_bn, { lower: true, strict: true });
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const supabase = createAdminClient();

    const { data, error } = await supabase.from('masjids').insert({
      name_bn: name_bn.trim(),
      name_en: name_en?.trim() || null,
      slug,
      division_id,
      district_id,
      upazila_id: formData.get('upazila_id') ? Number(formData.get('upazila_id')) : null,
      area_name_bn: (formData.get('area_name_bn') as string)?.trim() || null,
      area_name_en: (formData.get('area_name_en') as string)?.trim() || null,
      address_bn: (formData.get('address_bn') as string)?.trim() || null,
      latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
      longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
      structure_type: (formData.get('structure_type') as string) || 'unknown',
      established_year: formData.get('established_year') ? Number(formData.get('established_year')) : null,
      description_bn: (formData.get('description_bn') as string)?.trim() || null,
      contact_number: (formData.get('contact_number') as string)?.trim() || null,
      email: (formData.get('email') as string)?.trim() || null,
      status: (formData.get('status') as string) || 'draft',
      verification_status: (formData.get('verification_status') as string) || 'unverified',
      has_contact: !!((formData.get('contact_number') as string)?.trim() || (formData.get('email') as string)?.trim()),
    }).select('id').single();

    if (error) {
      console.error('Admin create error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Create masjid error:', err);
    return { success: false, error: 'সমস্যা হয়েছে' };
  }
}
