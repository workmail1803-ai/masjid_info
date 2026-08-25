import Link from 'next/link';
import { requireModerator } from '@/lib/auth/dal';

export default async function AdminImportPage() {
  await requireModerator('/admin');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="btn btn-ghost btn-sm">← ড্যাশবোর্ড</Link>
        <h1 className="text-xl font-bold text-ink">বাল্ক আমদানি</h1>
      </div>

      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-lg font-semibold text-ink mb-2">শীঘ্রই আসছে</h2>
        <p className="text-sm text-ink-muted max-w-md mx-auto">
          CSV/JSON ফাইল থেকে বাল্ক মসজিদ আমদানি ফিচার শীঘ্রই যুক্ত করা হবে।
          বর্তমানে আপনি একটি একটি করে মসজিদ যোগ করতে পারেন।
        </p>
        <Link href="/admin/masjids/new" className="btn btn-primary mt-6">
          ➕ নতুন মসজিদ যোগ করুন
        </Link>
      </div>
    </div>
  );
}
