import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireMosqueCapability } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProfileForm, type ProfileValues } from '@/features/mosque/EditorForms';

export const metadata: Metadata = { title: 'প্রোফাইল', robots: { index: false, follow: false } };

export default async function EditProfilePage({
  params,
}: { params: Promise<{ masjidId: string }> }) {
  const { masjidId } = await params;
  await requireMosqueCapability(masjidId, 'manage_profile', `/dashboard/mosque/${masjidId}/profile`);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('masjids')
    .select(`id, name_bn, name_en, area_name_bn, address_bn, description_bn, history_bn,
             established_year, capacity, floors, official_phone, official_email,
             latitude, longitude, structure_type, has_women_prayer_area, has_wudu_facility,
             has_toilet, has_parking, is_wheelchair_accessible, has_ac, has_library`)
    .eq('id', masjidId)
    .maybeSingle();

  if (error) console.error('Profile load failed:', error.message);
  if (!data) notFound();

  return (
    <div className="max-w-3xl">
      <h3 className="font-semibold text-ink mb-1">প্রোফাইল সম্পাদনা</h3>
      <p className="text-sm text-ink-muted mb-5">
        এখানকার সব তথ্য মসজিদের সর্বজনীন পাতায় দেখা যাবে।
      </p>
      <ProfileForm masjid={data as unknown as ProfileValues} />
    </div>
  );
}
