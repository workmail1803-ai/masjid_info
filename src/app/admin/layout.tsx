import Link from 'next/link';
import { requireModerator } from '@/lib/auth/dal';
import { PanelHeader } from '@/components/layout/PanelHeader';
import { signOut } from '@/features/auth/actions';

/**
 * Platform administration panel.
 *
 * The `requireModerator()` call is the real authorization boundary. `proxy.ts`
 * only performs an optimistic cookie check and does not run for Server Action
 * POSTs aimed at routes outside its matcher, so it cannot be relied on here.
 */

// Only routes that actually exist. Adding a link before its page ships
// produces a 404 in the middle of the admin panel.
const adminNav = [
  { label: 'ড্যাশবোর্ড', href: '/admin', icon: '📊' },
  { label: 'মসজিদ', href: '/admin/masjids', icon: '🕌' },
  { label: 'জমা', href: '/admin/submissions', icon: '📥' },
  { label: 'মসজিদ দাবি', href: '/admin/claims', icon: '🔑' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireModerator('/admin');

  return (
    <>
    <PanelHeader label="প্ল্যাটফর্ম প্রশাসন" userLabel={user.fullName || user.email} roleLabel={user.role} homeHref="/admin" />
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 bg-surface-elevated border-r border-border overflow-y-auto">
        <div className="p-4">
          <h2
            className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3"
            style={{ fontFamily: 'var(--font-latin)' }}
          >
            Admin
          </h2>
          <nav className="space-y-0.5">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm text-ink-light hover:text-ink hover:bg-surface-alt rounded-md transition-colors"
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-ink-faint mb-1">সাইন ইন</p>
            <p className="text-sm text-ink truncate" title={user.email ?? ''}>
              {user.fullName || user.email}
            </p>
            <p className="text-xs text-ink-muted mb-2">{user.role}</p>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost btn-sm w-full">
                লগআউট
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">{children}</div>
    </div>
    </>
  );
}
