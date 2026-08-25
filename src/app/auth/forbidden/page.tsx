import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/dal';
import { signOut } from '@/features/auth/actions';

export const metadata: Metadata = {
  title: 'প্রবেশাধিকার নেই',
  robots: { index: false, follow: false },
};

export default async function ForbiddenPage() {
  const user = await getCurrentUser();

  return (
    <>
      <div className="divider-accent mb-3" />
      <h1 className="text-xl font-bold text-ink mb-2">প্রবেশাধিকার নেই</h1>
      <p className="text-sm text-ink-light leading-relaxed mb-6">
        এই পাতায় প্রবেশের অনুমতি আপনার অ্যাকাউন্টে নেই। আপনি যদি কোনো মসজিদের
        দায়িত্বে থাকেন, সেই মসজিদের জন্য আবেদন করুন — প্ল্যাটফর্ম প্রশাসক যাচাই
        করার পর প্রবেশাধিকার দেওয়া হবে।
      </p>

      <div className="flex flex-col gap-2">
        <Link href="/dashboard" className="btn btn-primary">
          ড্যাশবোর্ডে যান
        </Link>
        <Link href="/" className="btn btn-ghost">
          হোমে ফিরুন
        </Link>

        {user && (
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm w-full text-ink-muted">
              অন্য অ্যাকাউন্টে লগইন করুন ({user.email})
            </button>
          </form>
        )}
      </div>
    </>
  );
}
