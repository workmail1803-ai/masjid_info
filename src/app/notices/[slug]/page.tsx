import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getNoticeBySlug } from '@/lib/services/content.service';

export const revalidate = 3600;

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const notice = await getNoticeBySlug(slug);
  if (!notice) return { title: 'নোটিশ পাওয়া যায়নি' };
  return { title: notice.title_bn };
}

export default async function NoticeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const notice = await getNoticeBySlug(slug);
  if (!notice) notFound();

  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <nav className="text-xs text-ink-muted mb-4"><a href="/notices" className="hover:text-accent">নোটিশ বোর্ড</a> / <span className="text-ink">{notice.title_bn}</span></nav>
      <article>
        <h1 className="text-2xl font-bold text-ink mb-2">{notice.title_bn}</h1>
        {notice.published_at && <p className="text-xs text-ink-faint mb-6">{new Date(notice.published_at).toLocaleDateString('bn-BD')}</p>}
        {notice.body_bn && <div className="prose text-sm text-ink-light leading-relaxed whitespace-pre-line">{notice.body_bn}</div>}
      </article>
    </div>
  );
}
