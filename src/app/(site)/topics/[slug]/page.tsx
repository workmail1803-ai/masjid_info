import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTopicBySlug } from '@/lib/services/content.service';

export const revalidate = 3600;
interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return { title: 'বিষয় পাওয়া যায়নি' };
  return { title: topic.title_bn };
}

export default async function TopicDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();
  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <nav className="text-xs text-ink-muted mb-4"><Link href="/topics" className="hover:text-accent">বিষয়</Link> / <span className="text-ink">{topic.title_bn}</span></nav>
      <article>
        <h1 className="text-2xl font-bold text-ink mb-6">{topic.title_bn}</h1>
        {topic.content_bn && <div className="text-sm text-ink-light leading-relaxed whitespace-pre-line">{topic.content_bn}</div>}
      </article>
    </div>
  );
}
