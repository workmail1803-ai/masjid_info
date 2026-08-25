import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/features/auth/AuthForms';
import { getCurrentUser } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'নিবন্ধন',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <>
      <div className="divider-accent mb-3" />
      <h1 className="text-xl font-bold text-ink mb-1">নিবন্ধন</h1>
      <p className="text-sm text-ink-muted mb-6">
        অ্যাকাউন্ট তৈরি করার পর আপনি নির্দিষ্ট মসজিদের ব্যবস্থাপনার জন্য আবেদন করতে
        পারবেন। প্ল্যাটফর্ম প্রশাসক যাচাই করার পর প্রবেশাধিকার দেওয়া হবে।
      </p>
      <RegisterForm />
    </>
  );
}
