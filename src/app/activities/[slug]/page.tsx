import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getActivityBySlug } from '@/lib/services/content.service';

export const revalidate = 3600;

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) return { title: 'কার্যক্রম পাওয়া যায়নি' };
  return { title: activity.title_bn, description: activity.description_bn ?? undefined };
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) notFound();

  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <nav className="text-xs text-ink-muted mb-4">
        <Link href="/activities" className="hover:text-accent">কার্যক্রম</Link>
        {' / '}
        <span className="text-ink">{activity.title_bn}</span>
      </nav>

      <article>
        <h1 className="text-2xl font-bold text-ink mb-2">{activity.title_bn}</h1>

        <div className="flex flex-wrap gap-3 mb-6 text-xs text-ink-faint">
          {activity.event_date && (
            <span>📅 {new Date(activity.event_date).toLocaleDateString('bn-BD')}</span>
          )}
          {activity.location_bn && <span>📍 {activity.location_bn}</span>}
        </div>

        {activity.description_bn && (
          <div className="prose text-sm text-ink-light leading-relaxed whitespace-pre-line">
            {activity.description_bn}
          </div>
        )}
      </article>
    </div>
  );
}
