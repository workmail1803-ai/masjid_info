import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'সম্পর্কে',
  description: 'MOSJID.INFO সম্পর্কে জানুন — বাংলাদেশের মসজিদ তথ্য ও ডিরেক্টরি প্ল্যাটফর্ম।',
};

export default function AboutPage() {
  return (
    <div className="container-wide py-6 md:py-8 max-w-3xl mx-auto">
      <div className="divider-accent mb-3" />
      <h1 className="text-2xl md:text-3xl font-bold text-ink mb-8">সম্পর্কে</h1>

      <div className="space-y-8">
        <Section title="আমাদের লক্ষ্য">
          <p>MOSJID.INFO বাংলাদেশের সকল মসজিদের তথ্য একত্রিত করে একটি নির্ভরযোগ্য, সর্বজনীন এবং সহজে ব্যবহারযোগ্য জাতীয় ডিরেক্টরি তৈরির উদ্যোগ। আমরা বিশ্বাস করি, প্রতিটি মসজিদের তথ্য সবার জন্য সহজলভ্য হওয়া উচিত।</p>
        </Section>

        <Section title="আমাদের দৃষ্টিভঙ্গি">
          <p>আমরা এমন একটি প্ল্যাটফর্ম তৈরি করতে চাই যেখানে বাংলাদেশের প্রতিটি মসজিদের সঠিক ও হালনাগাদ তথ্য পাওয়া যাবে — অবস্থান, যোগাযোগ, কার্যক্রম, এবং আরও অনেক কিছু।</p>
        </Section>

        <Section title="কেন MOSJID.INFO?">
          <ul className="list-disc list-inside space-y-2 text-ink-light">
            <li>বাংলাদেশে আনুমানিক ৩ লক্ষেরও বেশি মসজিদ রয়েছে</li>
            <li>কোনো কেন্দ্রীয় ও নির্ভরযোগ্য ডিরেক্টরি এখন পর্যন্ত নেই</li>
            <li>মসজিদ খুঁজে পাওয়া, যোগাযোগ করা, এবং তথ্য যাচাই করা কঠিন</li>
            <li>আমরা এই সমস্যার সমাধান করতে চাই</li>
          </ul>
        </Section>

        <Section title="তথ্য সংগ্রহ পদ্ধতি">
          <p>আমাদের তথ্য সংগ্রহ করা হয় বিভিন্ন উৎস থেকে — সরকারি তথ্য, জনসাধারণের জমা, মসজিদ কমিটি, এবং যাচাইকৃত তৃতীয় পক্ষের উৎস। প্রতিটি তথ্য প্রকাশের আগে যাচাই করা হয়।</p>
        </Section>

        <Section title="যাচাই পদ্ধতি">
          <p>জমা দেওয়া প্রতিটি মসজিদের তথ্য আমাদের দল দ্বারা পর্যালোচনা করা হয়। ডুপ্লিকেট শনাক্তকরণ, অবস্থান যাচাই, এবং তথ্যের সঠিকতা নিশ্চিত করার পর তথ্যটি প্রকাশিত হয়।</p>
        </Section>

        <Section title="ভবিষ্যৎ পরিকল্পনা">
          <ul className="list-disc list-inside space-y-2 text-ink-light">
            <li>নামাজের সময়সূচী সংযোজন</li>
            <li>মোবাইল অ্যাপ তৈরি</li>
            <li>মসজিদ কমিটির জন্য ড্যাশবোর্ড</li>
            <li>সম্প্রদায়ের কার্যক্রম ও ইভেন্ট ব্যবস্থাপনা</li>
            <li>আরও উন্নত মানচিত্র ও অনুসন্ধান</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold text-ink mb-3">{title}</h2>
      <div className="text-sm text-ink-light leading-relaxed">{children}</div>
    </section>
  );
}
