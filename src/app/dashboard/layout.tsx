import { requireUser } from '@/lib/auth/dal';
import { PanelHeader } from '@/components/layout/PanelHeader';

/**
 * Mosque management area. Any signed-in user may reach it — it is where they
 * see their memberships and file a claim. Individual mosque sections enforce
 * their own capability checks via `requireMosqueCapability()`.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/dashboard');

  return (
    <>
      <PanelHeader
        label="মসজিদ ব্যবস্থাপনা"
        userLabel={user.fullName || user.email}
        homeHref="/dashboard"
      />
      <div className="container-wide py-6 md:py-8">{children}</div>
    </>
  );
}
