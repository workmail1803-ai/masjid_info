import Link from 'next/link';
import { requireUser } from '@/lib/auth/dal';
import { signOut } from '@/features/auth/actions';

/**
 * Mosque management area. Any signed-in user may reach it — it is where they
 * see their memberships and file a claim. Individual mosque sections enforce
 * their own capability checks via `requireMosqueCapability()`.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/dashboard');

  return (
    <div className="container-wide py-6 md:py-8">
      <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div>
          <div className="divider-accent mb-3" />
          <h1 className="text-xl font-bold text-ink">মসজিদ ব্যবস্থাপনা</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {user.fullName || user.email}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="btn btn-ghost btn-sm">
            সাইট
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm">
              লগআউট
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  );
}
