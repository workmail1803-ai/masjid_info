import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedActivities } from '@/lib/services/content.service';

export const metadata: Metadata = {
  title: 'কার্যক্রম',
  description: 'মসজিদভিত্তিক ইসলামিক কার্যক্রম ও আসন্ন অনুষ্ঠান',
};

export const revalidate = 300;

export default async function ActivitiesPage() {
  const { results: activities } = await getPublishedActivities();
  const today = new Date().toISOString().split('T')[0];

  const upcoming = activities.filter((a) => a.event_date && a.event_date >= today);
  const past = activities.filter((a) => !a.event_date || a.event_date < today);

  return (
    <div className="container-wide py-6 md:py-8 max-w-4xl mx-auto">
      <div className="divider-accent mb-3" />
      <h1 className="text-2xl font-bold text-ink mb-6">কার্যক্রম</h1>

      {activities.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-ink-muted">বর্তমানে কোনো কার্যক্রম নেই।</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-3">আসন্ন কার্যক্রম</h2>
          <div className="space-y-4">
            {upcoming.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink mb-3">পূর্ববর্তী কার্যক্রম</h2>
          <div className="space-y-4">
            {past.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActivityCard({
  activity,
}: {
  activity: { id: string; slug: string; title_bn: string; description_bn: string | null; event_date: string | null; location_bn: string | null };
}) {
  return (
    <Link
      href={`/activities/${activity.slug}`}
      className="card card-accent p-5 block hover:border-accent transition-all"
    >
      <h3 className="font-semibold text-ink mb-1">{activity.title_bn}</h3>
      {activity.description_bn && (
        <p className="text-sm text-ink-muted line-clamp-2">{activity.description_bn}</p>
      )}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink-faint">
        {activity.event_date && (
          <span>📅 {new Date(activity.event_date).toLocaleDateString('bn-BD')}</span>
        )}
        {activity.location_bn && <span>📍 {activity.location_bn}</span>}
      </div>
    </Link>
  );
}
