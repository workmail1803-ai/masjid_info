import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedTopics } from '@/lib/services/content.service';

export const metadata: Metadata = { title: 'ইসলামিক বিষয়', description: 'ইসলামিক বিষয়সমূহ ও জ্ঞান' };
export const revalidate = 300;

export default async function TopicsPage() {
  const { results: topics } = await getPublishedTopics();
  return (
    <div className="container-wide py-6 md:py-8 max-w-4xl mx-auto">
      <div className="divider-accent mb-3" />
      <h1 className="text-2xl font-bold text-ink mb-6">ইসলামিক বিষয়</h1>
      {topics.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => (
            <Link key={topic.id} href={`/topics/${topic.slug}`} className="card p-5 hover:border-accent transition-all">
              <h2 className="font-semibold text-ink mb-1">{topic.title_bn}</h2>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center"><p className="text-ink-muted">বর্তমানে কোনো বিষয় নেই।</p></div>
      )}
    </div>
  );
}
