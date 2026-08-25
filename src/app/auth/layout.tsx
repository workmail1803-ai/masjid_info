import Link from 'next/link';
import { siteConfig } from '@/config/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-wide py-10 md:py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-latin)' }}>
              MOSJID<span className="text-accent">.INFO</span>
            </span>
          </Link>
          <p className="text-sm text-ink-muted mt-1">{siteConfig.tagline}</p>
        </div>

        <div className="card p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}
