import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

/**
 * Public site shell.
 *
 * The site header and footer live here rather than in the root layout so that
 * /admin and /dashboard do not inherit them — clicking a directory link from
 * inside a management panel used to navigate straight out of it.
 *
 * `(site)` is a route group: it shapes the layout tree without appearing in any
 * URL, so every public path is unchanged.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
