import Link from 'next/link';

const adminNav = [
  { label: 'ড্যাশবোর্ড', href: '/admin', icon: '📊' },
  { label: 'মসজিদ', href: '/admin/masjids', icon: '🕌' },
  { label: 'জমা', href: '/admin/submissions', icon: '📥' },
  { label: 'ডুপ্লিকেট', href: '/admin/duplicates', icon: '🔍' },
  { label: 'আমদানি', href: '/admin/import', icon: '📤' },
  { label: 'ছবি', href: '/admin/images', icon: '🖼️' },
  { label: 'নোটিশ', href: '/admin/notices', icon: '📋' },
  { label: 'সংবাদ', href: '/admin/news', icon: '📰' },
  { label: 'বিষয়', href: '/admin/topics', icon: '📚' },
  { label: 'রিসোর্স', href: '/admin/resources', icon: '📁' },
  { label: 'ব্যবহারকারী', href: '/admin/users', icon: '👤' },
  { label: 'অডিট লগ', href: '/admin/audit-log', icon: '📝' },
  { label: 'সেটিংস', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 bg-surface-elevated border-r border-border overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-latin)' }}>
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
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
