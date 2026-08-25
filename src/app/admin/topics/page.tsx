import type { Metadata } from 'next';
import { ContentManagerPage } from '@/features/admin/ContentManagerPage';

export const metadata: Metadata = {
  title: 'ইসলামিক বিষয় ব্যবস্থাপনা',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ContentManagerPage kind="topics" />;
}
