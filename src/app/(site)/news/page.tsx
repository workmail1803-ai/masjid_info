import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedNews } from '@/lib/services/content.service';

export const metadata: Metadata = { title: 'সংবাদ', description: 'মসজিদ সম্পর্কিত সংবাদ ও খবর' };
export const revalidate = 300;

export default async function NewsPage() {
  const { results: news } = await getPublishedNews();
  return (
    <div className="container-wide py-6 md:py-8 max-w-4xl mx-auto">
      <div className="divider-accent mb-3" />
      <h1 className="text-2xl font-bold text-ink mb-6">সংবাদ</h1>
      {news.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {news.map((post) => (
            <Link key={post.id} href={`/news/${post.slug}`} className="card p-5 hover:border-accent transition-all">
              <h2 className="font-semibold text-ink mb-1 line-clamp-2">{post.title_bn}</h2>
              {post.excerpt_bn && <p className="text-sm text-ink-muted line-clamp-2 mt-1">{post.excerpt_bn}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs text-ink-faint">
                {post.author_name && <span>{post.author_name}</span>}
                {post.published_at && <span style={{ fontFamily: 'var(--font-latin)' }}>{new Date(post.published_at).toLocaleDateString('bn-BD')}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center"><p className="text-ink-muted">বর্তমানে কোনো সংবাদ নেই।</p></div>
      )}
    </div>
  );
}
