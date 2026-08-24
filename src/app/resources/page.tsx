import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedResources } from '@/lib/services/content.service';

export const metadata: Metadata = { title: 'রিসোর্স', description: 'মসজিদ সম্পর্কিত রিসোর্স ও উপকরণ' };
export const revalidate = 300;

export default async function ResourcesPage() {
  const { results: resources } = await getPublishedResources();
  return (
    <div className="container-wide py-6 md:py-8 max-w-4xl mx-auto">
      <div className="divider-accent mb-3" />
      <h1 className="text-2xl font-bold text-ink mb-6">রিসোর্স ও উপকরণ</h1>
      {resources.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <Link key={resource.id} href={`/resources/${resource.slug}`} className="card p-5 hover:border-accent transition-all">
              <h2 className="font-semibold text-ink mb-1">{resource.title_bn}</h2>
              {resource.description_bn && <p className="text-sm text-ink-muted line-clamp-2 mt-1">{resource.description_bn}</p>}
              {resource.file_type && <span className="badge badge-unverified mt-2">{resource.file_type}</span>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center"><p className="text-ink-muted">বর্তমানে কোনো রিসোর্স নেই।</p></div>
      )}
    </div>
  );
}
