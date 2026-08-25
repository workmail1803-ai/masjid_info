import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getResourceBySlug } from '@/lib/services/content.service';

export const revalidate = 3600;
interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);
  if (!resource) return { title: 'রিসোর্স পাওয়া যায়নি' };
  return { title: resource.title_bn };
}

export default async function ResourceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);
  if (!resource) notFound();
  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <nav className="text-xs text-ink-muted mb-4"><Link href="/resources" className="hover:text-accent">রিসোর্স</Link> / <span className="text-ink">{resource.title_bn}</span></nav>
      <h1 className="text-2xl font-bold text-ink mb-4">{resource.title_bn}</h1>
      {resource.description_bn && <div className="text-sm text-ink-light leading-relaxed whitespace-pre-line mb-6">{resource.description_bn}</div>}
      {resource.file_path && <a href={resource.file_path} download className="btn btn-primary">ডাউনলোড করুন</a>}
    </div>
  );
}
