import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-alt mt-16">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <div className="mb-3">
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-latin)' }}>
                MOSJID<span className="text-accent">.INFO</span>
              </span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              {siteConfig.tagline}
            </p>
            <p className="text-xs text-ink-faint mt-2">
              বাংলাদেশের সকল মসজিদের তথ্য একত্রিত করে একটি নির্ভরযোগ্য জাতীয় ডিরেক্টরি তৈরির উদ্যোগ।
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-latin)' }}>
              Directory
            </h3>
            <ul className="space-y-2">
              <li><Link href="/masjid" className="text-sm text-ink-light hover:text-accent transition-colors">মসজিদ ডিরেক্টরি</Link></li>
              <li><Link href="/masjid/add" className="text-sm text-ink-light hover:text-accent transition-colors">মসজিদ যোগ করুন</Link></li>
              <li><Link href="/notices" className="text-sm text-ink-light hover:text-accent transition-colors">নোটিশ বোর্ড</Link></li>
              <li><Link href="/news" className="text-sm text-ink-light hover:text-accent transition-colors">সংবাদ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-latin)' }}>
              Information
            </h3>
            <ul className="space-y-2">
              <li><Link href="/topics" className="text-sm text-ink-light hover:text-accent transition-colors">ইসলামিক বিষয়</Link></li>
              <li><Link href="/resources" className="text-sm text-ink-light hover:text-accent transition-colors">রিসোর্স</Link></li>
              <li><Link href="/about" className="text-sm text-ink-light hover:text-accent transition-colors">সম্পর্কে</Link></li>
              <li><Link href="/contact" className="text-sm text-ink-light hover:text-accent transition-colors">যোগাযোগ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-latin)' }}>
              Browse
            </h3>
            <ul className="space-y-2">
              <li><Link href="/division/dhaka" className="text-sm text-ink-light hover:text-accent transition-colors">ঢাকা বিভাগ</Link></li>
              <li><Link href="/division/chattogram" className="text-sm text-ink-light hover:text-accent transition-colors">চট্টগ্রাম বিভাগ</Link></li>
              <li><Link href="/division/rajshahi" className="text-sm text-ink-light hover:text-accent transition-colors">রাজশাহী বিভাগ</Link></li>
              <li><Link href="/division/sylhet" className="text-sm text-ink-light hover:text-accent transition-colors">সিলেট বিভাগ</Link></li>
            </ul>
          </div>
        </div>

        <div className="divider my-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-faint">
            © {new Date().getFullYear()} MOSJID.INFO — সর্বস্বত্ব সংরক্ষিত
          </p>
          <p className="text-xs text-ink-faint">
            তথ্যে ভুল পেলে <Link href="/contact" className="text-accent hover:underline">জানান</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
