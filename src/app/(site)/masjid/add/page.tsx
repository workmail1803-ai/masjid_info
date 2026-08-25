import Link from 'next/link';
import type { Metadata } from 'next';
import { SubmissionForm } from '@/features/submission/SubmissionForm';
import { getDivisions, getDistricts } from '@/lib/services/geography.service';

export const metadata: Metadata = {
  title: 'মসজিদ যোগ করুন',
  description: 'আপনার পরিচিত মসজিদের তথ্য জমা দিন। যাচাইয়ের পর তথ্যটি ডিরেক্টরিতে প্রকাশিত হবে।',
};

export default async function AddMasjidPage() {
  const [divisions, districts] = await Promise.all([
    getDivisions(),
    getDistricts(),
  ]);

  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <nav className="text-xs text-ink-muted mb-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><Link href="/" className="hover:text-accent">হোম</Link></li>
          <li>/</li>
          <li><Link href="/masjid" className="hover:text-accent">ডিরেক্টরি</Link></li>
          <li>/</li>
          <li className="text-ink">মসজিদ যোগ করুন</li>
        </ol>
      </nav>

      <div className="mb-8">
        <div className="divider-accent mb-3" />
        <h1 className="text-2xl font-bold text-ink">মসজিদ যোগ করুন</h1>
        <p className="text-sm text-ink-muted mt-2">
          আপনার পরিচিত মসজিদের তথ্য জমা দিন। প্রতিটি তথ্য যাচাইয়ের পর প্রকাশিত হবে।
        </p>
      </div>

      <SubmissionForm divisions={divisions} districts={districts} />
    </div>
  );
}
