import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-wide py-20 text-center">
      <div className="max-w-md mx-auto">
        <div className="text-6xl font-bold text-ink-faint mb-4" style={{ fontFamily: 'var(--font-latin)' }}>
          ৪০৪
        </div>
        <h1 className="text-xl font-bold text-ink mb-2">পৃষ্ঠা পাওয়া যায়নি</h1>
        <p className="text-sm text-ink-muted mb-6">
          আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি পাওয়া যায়নি।
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn btn-primary">হোমে ফিরুন</Link>
          <Link href="/masjid" className="btn btn-secondary">ডিরেক্টরি দেখুন</Link>
        </div>
      </div>
    </div>
  );
}
