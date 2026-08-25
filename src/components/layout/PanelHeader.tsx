import Link from 'next/link';
import { signOut } from '@/features/auth/actions';

/**
 * Chrome for the management panels (/admin, /dashboard).
 *
 * Deliberately NOT the public site Header: its links point at the directory,
 * so using it inside a panel meant every nav click navigated out of the panel.
 * This keeps the brand and one explicit "view the site" escape hatch.
 */
export function PanelHeader({
  label,
  userLabel,
  roleLabel,
  homeHref = '/dashboard',
}: {
  label: string;
  userLabel?: string | null;
  roleLabel?: string | null;
  homeHref?: string;
}) {
  return (
    <header className="border-b border-border bg-surface-elevated sticky top-0 z-30">
      <div className="container-wide flex items-center justify-between gap-4 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={homeHref} className="shrink-0">
            <span
              className="text-base font-bold text-ink"
              style={{ fontFamily: 'var(--font-latin)' }}
            >
              MOSJID<span className="text-accent">.INFO</span>
            </span>
          </Link>
          <span className="text-xs text-ink-faint hidden sm:inline">|</span>
          <span className="text-sm text-ink-muted truncate hidden sm:inline">{label}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {userLabel && (
            <span className="text-xs text-ink-muted hidden md:inline truncate max-w-[180px]">
              {userLabel}
              {roleLabel && <span className="text-ink-faint"> · {roleLabel}</span>}
            </span>
          )}
          <Link href="/" className="btn btn-ghost btn-sm" target="_blank" rel="noopener">
            সাইট দেখুন ↗
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm">
              লগআউট
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
