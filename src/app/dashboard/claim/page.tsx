import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ClaimForm } from '@/features/auth/ClaimForm';

export const metadata: Metadata = {
  title: 'মসজিদের দায়িত্ব দাবি',
  robots: { index: false, follow: false },
};

export default async function ClaimPage() {
  await requireUser('/dashboard/claim');

  const supabase = await createServerSupabaseClient();

  // Published mosques only — you cannot claim a draft record you cannot see.
  const { data, error } = await supabase
    .from('masjids')
    .select('id, name_bn, name_en, district:districts(name_bn)')
    .eq('status', 'published')
    .order('name_bn')
    .limit(1000);

  if (error) {
    console.error('Mosque list for claim failed:', error.message);
  }

  const masjids = (data ?? []).map((m) => {
    const district = m.district as unknown as { name_bn: string } | null;
    return {
      id: m.id as string,
      name_bn: m.name_bn as string,
      name_en: (m.name_en as string | null) ?? null,
      district_name_bn: district?.name_bn ?? null,
    };
  });

  return (
    <div className="max-w-2xl">
      <nav className="text-xs text-ink-muted mb-4">
        <Link href="/dashboard" className="hover:text-accent">ড্যাশবোর্ড</Link>
        {' / '}
        <span className="text-ink">দায়িত্ব দাবি</span>
      </nav>

      <h2 className="text-lg font-bold text-ink mb-1">মসজিদের দায়িত্ব দাবি করুন</h2>
      <p className="text-sm text-ink-light leading-relaxed mb-6">
        আপনি যে মসজিদের দায়িত্বে আছেন সেটি নির্বাচন করে আবেদন জমা দিন। প্ল্যাটফর্ম
        প্রশাসক তথ্য যাচাই করার পর আপনাকে সেই মসজিদের ব্যবস্থাপনা প্যানেলে
        প্রবেশাধিকার দেওয়া হবে। যাচাই ছাড়া কোনো প্রবেশাধিকার দেওয়া হয় না।
      </p>

      {masjids.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-muted">এখনো কোনো প্রকাশিত মসজিদ নেই।</p>
        </div>
      ) : (
        <ClaimForm masjids={masjids} />
      )}
    </div>
  );
}
