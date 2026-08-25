import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginTabs } from '@/features/auth/LoginTabs';
import { getCurrentUser } from '@/lib/auth/dal';

export const metadata: Metadata = {
  title: 'লগইন',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirect: redirectTo } = await searchParams;

  // Already signed in — no reason to show the form again.
  const user = await getCurrentUser();
  if (user) {
    redirect(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard');
  }

  return (
    <>
      <div className="divider-accent mb-3" />
      <h1 className="text-xl font-bold text-ink mb-1">লগইন</h1>
      <p className="text-sm text-ink-muted mb-6">
        মসজিদ ব্যবস্থাপনা প্যানেলে প্রবেশ করুন।
      </p>
      <LoginTabs redirectTo={redirectTo} />
    </>
  );
}
