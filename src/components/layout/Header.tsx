import Link from 'next/link';
import { navigation } from '@/config/navigation';
import { MobileNav } from './MobileNav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-surface-elevated/95 backdrop-blur-sm border-b border-border">
      <div className="container-wide">
        {/* Top bar — thin accent line */}
        <div className="h-[2px] bg-accent -mx-4 md:-mx-6 lg:-mx-8 mb-0" />

        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight text-ink" style={{ fontFamily: 'var(--font-latin)' }}>
                MOSJID<span className="text-accent">.INFO</span>
              </span>
              <span className="text-[10px] text-ink-muted hidden sm:block">
                বাংলাদেশের মসজিদ ডিরেক্টরি
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {navigation.main.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-ink-light hover:text-ink hover:bg-surface-alt rounded-md transition-colors"
              >
                {item.labelBn}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile */}
          <div className="flex items-center gap-2">
            <Link
              href={navigation.cta.primary.href}
              className="btn btn-primary btn-sm hidden sm:inline-flex"
            >
              <SearchIcon />
              {navigation.cta.primary.labelBn}
            </Link>
            <Link
              href={navigation.cta.secondary.href}
              className="btn btn-secondary btn-sm hidden md:inline-flex"
            >
              {navigation.cta.secondary.labelBn}
            </Link>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
