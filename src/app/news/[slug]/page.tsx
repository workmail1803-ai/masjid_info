import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getNewsBySlug } from '@/lib/services/content.service';

export const revalidate = 3600;
interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) return { title: 'সংবাদ পাওয়া যায়নি' };
  return { title: post.title_bn, description: post.excerpt_bn || undefined };
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) notFound();

  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <nav className="text-xs text-ink-muted mb-4"><a href="/news" className="hover:text-accent">সংবাদ</a> / <span className="text-ink truncate">{post.title_bn}</span></nav>
      <article>
        <h1 className="text-2xl md:text-3xl font-bold text-ink mb-2">{post.title_bn}</h1>
        <div className="flex items-center gap-3 text-xs text-ink-faint mb-6">
          {post.author_name && <span>{post.author_name}</span>}
          {post.published_at && <span>{new Date(post.published_at).toLocaleDateString('bn-BD')}</span>}
        </div>
        {post.content_bn && <div className="text-sm text-ink-light leading-relaxed whitespace-pre-line">{post.content_bn}</div>}
      </article>
    </div>
  );
}
