import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedNotices } from '@/lib/services/content.service';

export const metadata: Metadata = {
  title: 'নোটিশ বোর্ড',
  description: 'মসজিদ সম্পর্কিত নোটিশ ও ঘোষণা',
};

export const revalidate = 300;

export default async function NoticesPage() {
  const { results: notices } = await getPublishedNotices();

  return (
    <div className="container-wide py-6 md:py-8 max-w-4xl mx-auto">
      <div className="divider-accent mb-3" />
      <h1 className="text-2xl font-bold text-ink mb-6">নোটিশ বোর্ড</h1>

      {notices.length > 0 ? (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Link key={notice.id} href={`/notices/${notice.slug}`} className="card card-accent p-5 block hover:border-accent transition-all">
              <h2 className="font-semibold text-ink mb-1">{notice.title_bn}</h2>
              {notice.body_bn && <p className="text-sm text-ink-muted line-clamp-2">{notice.body_bn}</p>}
              {notice.published_at && (
                <p className="text-xs text-ink-faint mt-2" style={{ fontFamily: 'var(--font-latin)' }}>
                  {new Date(notice.published_at).toLocaleDateString('bn-BD')}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-ink-muted">বর্তমানে কোনো নোটিশ নেই।</p>
        </div>
      )}
    </div>
  );
}
