import type { Metadata } from 'next';
import { ContactForm } from '@/features/contact/ContactForm';

export const metadata: Metadata = {
  title: 'যোগাযোগ',
  description: 'MOSJID.INFO এর সাথে যোগাযোগ করুন।',
};

export default function ContactPage() {
  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <div className="divider-accent mb-3" />
      <h1 className="text-2xl font-bold text-ink mb-6">যোগাযোগ</h1>

      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <ContactForm />
        </div>

        <aside className="md:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-ink mb-2">ইমেইল</h3>
            <p className="text-sm text-ink-light" style={{ fontFamily: 'var(--font-latin)' }}>info@mosjid.info</p>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-ink mb-2">সহযোগিতা</h3>
            <p className="text-sm text-ink-muted">
              মসজিদের তথ্য সংশোধন, নতুন তথ্য যোগ, বা যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন।
            </p>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-ink mb-2">তথ্য সংশোধন</h3>
            <p className="text-sm text-ink-muted">
              কোনো মসজিদের তথ্যে ভুল থাকলে সেই মসজিদের পৃষ্ঠা থেকে &quot;তথ্য সংশোধনের অনুরোধ&quot; বাটনে ক্লিক করুন।
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
