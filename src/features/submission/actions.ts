'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function submitMosque(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const name_bn = formData.get('name_bn') as string;
    const name_en = formData.get('name_en') as string;
    const division_id = formData.get('division_id') as string;
    const district_id = formData.get('district_id') as string;
    const area_name_bn = formData.get('area_name_bn') as string;
    const address_bn = formData.get('address_bn') as string;
    const structure_type = formData.get('structure_type') as string;
    const established_year = formData.get('established_year') as string;
    const description_bn = formData.get('description_bn') as string;
    const contact_number = formData.get('contact_number') as string;
    const email = formData.get('email') as string;
    const submitter_name = formData.get('submitter_name') as string;
    const submitter_contact = formData.get('submitter_contact') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;

    // Validate required fields
    if (!name_bn || !division_id || !district_id) {
      return { success: false, error: 'মসজিদের নাম, বিভাগ, এবং জেলা আবশ্যক।' };
    }

    // Use admin client to bypass RLS for public submissions
    const supabase = createAdminClient();

    // Insert submission
    const { data: submission, error } = await supabase.from('masjid_submissions').insert({
      name_bn: name_bn.trim(),
      name_en: name_en?.trim() || null,
      division_id: Number(division_id),
      district_id: Number(district_id),
      area_name_bn: area_name_bn?.trim() || null,
      address_bn: address_bn?.trim() || null,
      structure_type: structure_type || 'unknown',
      established_year: established_year ? Number(established_year) : null,
      description_bn: description_bn?.trim() || null,
      contact_number: contact_number?.trim() || null,
      email: email?.trim() || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      submitter_name: submitter_name?.trim() || null,
      submitter_contact: submitter_contact?.trim() || null,
      status: 'pending_review',
    }).select('id').single();

    if (error) {
      console.error('Submission insert error:', error.message, error.details);
      return { success: false, error: 'জমা দেওয়া সম্ভব হয়নি। আবার চেষ্টা করুন।' };
    }

    // ----- Image uploads -----
    // The client component checks type and size too, but that is only a UX
    // convenience: a crafted POST bypasses it entirely, so re-validate here.
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const EXT_FOR = new Map([
      ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
    ]);
    const MAX_BYTES = 5 * 1024 * 1024;
    const MAX_FILES = 3;

    const images = formData.getAll('images') as File[];
    const validImages = images
      .filter((f) => f instanceof File && f.size > 0 && f.size <= MAX_BYTES && ALLOWED.has(f.type))
      .slice(0, MAX_FILES);

    if (validImages.length > 0 && submission?.id) {
      const uploadedPaths: string[] = [];

      for (let i = 0; i < validImages.length; i++) {
        const file = validImages[i];
        // Extension comes from the verified MIME type, never from the
        // user-supplied filename (which could carry a misleading suffix).
        const ext = EXT_FOR.get(file.type) ?? 'jpg';
        const path = `${submission.id}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          console.error(`Image upload ${i} failed:`, uploadError.message);
          continue;
        }
        uploadedPaths.push(path);
      }

      // Record where they landed. Without this the reviewer cannot see the
      // photos and approval silently drops them.
      if (uploadedPaths.length > 0) {
        const { error: pathError } = await supabase
          .from('masjid_submissions')
          .update({ image_paths: uploadedPaths })
          .eq('id', submission.id);

        if (pathError) {
          console.error('Recording image paths failed:', pathError.message);
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Submission error:', err);
    return { success: false, error: 'একটি সমস্যা হয়েছে।' };
  }
}
