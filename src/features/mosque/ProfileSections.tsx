import Link from 'next/link';
import { formatTaka, toBanglaDigits } from '@/lib/services/mosque.service';
import type {
  PrayerTimes, StaffMember, CommitteeMember, CommunityService,
  FinancialSummary, MonthlyFinancial, ZakatSummary, ZakatCategoryRow,
  TransparencyFactor, CampaignSummary, ProjectSummary, PublicDocument,
} from '@/lib/services/mosque.service';

/**
 * Public mosque profile sections. Server components throughout — these render
 * already-filtered data, so no private field can reach the client bundle.
 * Styling reuses the existing .card / .badge / .stat / .divider-accent system.
 */

export function Section({
  id, title, subtitle, children, action,
}: {
  id: string; title: string; subtitle?: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <div className="divider-accent mb-2" />
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-sm text-ink-muted">{children}</p>
    </div>
  );
}

function timeLabel(t: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = Number(h);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${toBanglaDigits(h12)}:${toBanglaDigits(m)} ${suffix}`;
}

// ============================================================
// Transparency score
// ============================================================
export function TransparencySection({
  total, factors,
}: { total: number; factors: TransparencyFactor[] }) {
  const tone =
    total >= 80 ? 'var(--color-verified)' : total >= 50 ? 'var(--color-warning)' : 'var(--color-ink-muted)';

  return (
    <Section
      id="transparency"
      title="স্বচ্ছতা স্কোর"
      subtitle="প্রকাশিত তথ্যের সম্পূর্ণতা পরিমাপ করে — মসজিদের গুণমান নয়"
    >
      <div className="card p-5">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="text-3xl font-bold shrink-0"
            style={{ color: tone, fontFamily: 'var(--font-latin)' }}
          >
            {toBanglaDigits(total)}%
          </div>
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--color-surface-alt)' }}
            role="progressbar"
            aria-valuenow={total}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="স্বচ্ছতা স্কোর"
          >
            <div className="h-full rounded-full transition-all" style={{ width: `${total}%`, background: tone }} />
          </div>
        </div>

        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {factors.map((f) => (
            <li key={f.factor} className="flex items-start gap-2 text-sm">
              <span aria-hidden style={{ color: f.earned ? 'var(--color-verified)' : 'var(--color-ink-faint)' }}>
                {f.earned ? '✓' : '○'}
              </span>
              <span className={f.earned ? 'text-ink-light' : 'text-ink-faint'}>
                {f.label_bn}
              </span>
              <span className="ml-auto text-xs text-ink-faint shrink-0" style={{ fontFamily: 'var(--font-latin)' }}>
                {toBanglaDigits(f.points)}/{toBanglaDigits(f.max_points)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ============================================================
// Prayer times
// ============================================================
const DAILY_ROWS: Array<[keyof PrayerTimes, string]> = [
  ['fajr', 'ফজর'], ['sunrise', 'সূর্যোদয়'], ['dhuhr', 'যোহর'],
  ['asr', 'আসর'], ['maghrib', 'মাগরিব'], ['isha', 'এশা'],
];

export function PrayerSection({ schedules }: { schedules: PrayerTimes[] }) {
  const daily = schedules.find((s) => s.kind === 'daily');
  const ramadan = schedules.find((s) => s.kind === 'ramadan');
  const eid = schedules.find((s) => s.kind === 'eid');

  return (
    <Section id="prayer" title="নামাজের সময়সূচি">
      {!daily ? (
        <Empty>নামাজের সময়সূচি এখনো যুক্ত করা হয়নি।</Empty>
      ) : (
        <div className="card overflow-hidden">
          <dl className="divide-y divide-border">
            {DAILY_ROWS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-sm text-ink">{label}</dt>
                <dd className="text-sm font-medium text-ink" style={{ fontFamily: 'var(--font-latin)' }}>
                  {timeLabel(daily[key] as string | null)}
                </dd>
              </div>
            ))}
            {daily.jumuah && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-surface-alt">
                <dt className="text-sm font-medium text-ink">জুমা</dt>
                <dd className="text-sm font-medium text-accent" style={{ fontFamily: 'var(--font-latin)' }}>
                  {timeLabel(daily.jumuah)}
                </dd>
              </div>
            )}
          </dl>

          {(ramadan || eid) && (
            <div className="px-4 py-3 border-t border-border grid sm:grid-cols-2 gap-3">
              {ramadan && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted mb-1">রমজান</p>
                  <p className="text-sm text-ink-light">
                    সেহরি শেষ {timeLabel(ramadan.sehri_end)} · ইফতার {timeLabel(ramadan.iftar)}
                    {ramadan.taraweeh && ` · তারাবি ${timeLabel(ramadan.taraweeh)}`}
                  </p>
                </div>
              )}
              {eid && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted mb-1">ঈদ জামাত</p>
                  <p className="text-sm text-ink-light">
                    {timeLabel(eid.eid_jamaat_1)}
                    {eid.eid_jamaat_2 && ` · ${timeLabel(eid.eid_jamaat_2)}`}
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="px-4 py-2 text-xs text-ink-faint border-t border-border">
            সর্বশেষ হালনাগাদ: {new Date(daily.updated_at).toLocaleDateString('bn-BD')}
          </p>
        </div>
      )}
    </Section>
  );
}

// ============================================================
// Staff & committee
// ============================================================
export function StaffSection({
  staff, officialPhone,
}: { staff: StaffMember[]; officialPhone: string | null }) {
  return (
    <Section id="staff" title="ইমাম ও মুয়াজ্জিন">
      {staff.length === 0 ? (
        <Empty>ইমাম ও মুয়াজ্জিনের তথ্য এখনো যুক্ত করা হয়নি।</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {staff.map((s) => (
            <div key={s.id} className="card p-4">
              <h3 className="font-semibold text-ink">{s.name_bn}</h3>
              <p className="text-xs text-accent mb-1.5">{s.position_label_bn || s.position}</p>
              {s.qualifications_bn && (
                <p className="text-sm text-ink-light">{s.qualifications_bn}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-ink-muted">
                {s.serving_since && (
                  <span>দায়িত্বে {new Date(s.serving_since).getFullYear()} সাল থেকে</span>
                )}
                {s.languages?.length ? <span>{s.languages.join(', ')}</span> : null}
              </div>
              {/* Personal numbers are shown only with explicit consent. */}
              {s.public_phone && (
                <p className="text-xs text-ink-light mt-1.5" style={{ fontFamily: 'var(--font-latin)' }}>
                  {s.public_phone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint mt-2">
        গোপনীয়তার কারণে ব্যক্তিগত মোবাইল নম্বর প্রকাশ করা হয় না।
        {officialPhone && (
          <> যোগাযোগের জন্য মসজিদের অফিসিয়াল নম্বর:{' '}
            <span className="text-ink" style={{ fontFamily: 'var(--font-latin)' }}>{officialPhone}</span>
          </>
        )}
      </p>
    </Section>
  );
}

export function CommitteeSection({ members }: { members: CommitteeMember[] }) {
  return (
    <Section id="committee" title="ব্যবস্থাপনা কমিটি">
      {members.length === 0 ? (
        <Empty>কমিটির তথ্য এখনো যুক্ত করা হয়নি।</Empty>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="p-3 text-ink">{m.name_bn}</td>
                  <td className="p-3 text-ink-muted text-right">{m.role_label_bn}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {members[0]?.term_start && (
            <p className="px-3 py-2 text-xs text-ink-faint border-t border-border">
              কমিটির মেয়াদ: {new Date(members[0].term_start).toLocaleDateString('bn-BD')}
              {members[0].term_end && ` — ${new Date(members[0].term_end).toLocaleDateString('bn-BD')}`}
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

export function ServicesSection({ services }: { services: CommunityService[] }) {
  return (
    <Section id="services" title="সমাজসেবা কার্যক্রম">
      {services.length === 0 ? (
        <Empty>সেবা কার্যক্রমের তথ্য এখনো যুক্ত করা হয়নি।</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((s) => (
            <div key={s.id} className="card p-4">
              <h3 className="font-medium text-ink text-sm mb-1">
                {s.icon && <span aria-hidden className="mr-1.5">{s.icon}</span>}
                {s.title_bn}
              </h3>
              {s.description_bn && <p className="text-xs text-ink-muted">{s.description_bn}</p>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ============================================================
// Financial transparency
// ============================================================
export function FinanceSection({
  summary, monthly,
}: { summary: FinancialSummary | null; monthly: MonthlyFinancial[] }) {
  const hasData = summary && Number(summary.txn_count) > 0;

  return (
    <Section
      id="finance"
      title="আর্থিক স্বচ্ছতা"
      subtitle="শুধুমাত্র অনুমোদিত ও প্রকাশিত লেনদেন থেকে হিসাব করা"
    >
      {!hasData ? (
        <Empty>আর্থিক প্রতিবেদন এখনো প্রকাশ করা হয়নি।</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">আয়</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-verified)' }}>
                {formatTaka(summary.income_paisa)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">ব্যয়</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-error)' }}>
                {formatTaka(summary.expense_paisa)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">উদ্বৃত্ত</p>
              <p className="text-lg font-bold text-ink">{formatTaka(summary.net_paisa)}</p>
            </div>
          </div>

          {monthly.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt text-xs text-ink-muted uppercase">
                    <tr>
                      <th className="text-left p-3">মাস</th>
                      <th className="text-right p-3">আয়</th>
                      <th className="text-right p-3">ব্যয়</th>
                      <th className="text-right p-3">উদ্বৃত্ত</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthly.map((m) => (
                      <tr key={m.month}>
                        <td className="p-3 text-ink">
                          {new Date(m.month).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' })}
                        </td>
                        <td className="p-3 text-right" style={{ color: 'var(--color-verified)' }}>
                          {formatTaka(m.income_paisa)}
                        </td>
                        <td className="p-3 text-right" style={{ color: 'var(--color-error)' }}>
                          {formatTaka(m.expense_paisa)}
                        </td>
                        <td className="p-3 text-right font-medium text-ink">{formatTaka(m.net_paisa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

// ============================================================
// Zakat — aggregates only, never identities
// ============================================================
const ZAKAT_LABELS: Record<string, string> = {
  poor_needy: 'দরিদ্র ও অসহায়',
  students: 'শিক্ষার্থী',
  emergency: 'জরুরি সহায়তা',
  debt_relief: 'ঋণগ্রস্ত',
  travellers: 'মুসাফির',
  other: 'অন্যান্য',
};

export function ZakatSection({
  summary, byCategory,
}: { summary: ZakatSummary | null; byCategory: ZakatCategoryRow[] }) {
  const hasData = summary && Number(summary.received_paisa) > 0;

  return (
    <Section
      id="zakat"
      title="যাকাত হিসাব"
      subtitle="সাধারণ দান থেকে সম্পূর্ণ আলাদাভাবে সংরক্ষিত"
    >
      {!hasData ? (
        <Empty>যাকাতের হিসাব এখনো প্রকাশ করা হয়নি।</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">গৃহীত</p>
              <p className="text-lg font-bold text-ink">{formatTaka(summary.received_paisa)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">বিতরণকৃত</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-verified)' }}>
                {formatTaka(summary.distributed_paisa)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-muted mb-1">অবশিষ্ট</p>
              <p className="text-lg font-bold text-ink">{formatTaka(summary.balance_paisa)}</p>
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-medium text-ink mb-3">
                মোট {toBanglaDigits(summary.total_beneficiaries)} জনকে সহায়তা করা হয়েছে
              </p>
              <ul className="space-y-2">
                {byCategory.map((c) => (
                  <li key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-ink-light">{ZAKAT_LABELS[c.category] ?? c.category}</span>
                    <span className="text-ink">
                      {toBanglaDigits(c.beneficiaries)} জন
                      <span className="text-ink-faint"> · {formatTaka(c.amount_paisa)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-ink-faint mt-2">
            গোপনীয়তা রক্ষার্থে যাকাত গ্রহীতাদের পরিচয় কখনো প্রকাশ করা হয় না — শুধুমাত্র
            সংখ্যাভিত্তিক তথ্য দেখানো হয়।
          </p>
        </>
      )}
    </Section>
  );
}

// ============================================================
// Campaigns & projects
// ============================================================
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="h-2 rounded-full overflow-hidden mt-2"
      style={{ background: 'var(--color-surface-alt)' }}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, percent)}%`, background: 'var(--color-accent)' }}
      />
    </div>
  );
}

export function CampaignsSection({ campaigns }: { campaigns: CampaignSummary[] }) {
  return (
    <Section id="campaigns" title="দান কর্মসূচি">
      {campaigns.length === 0 ? (
        <Empty>বর্তমানে কোনো দান কর্মসূচি নেই।</Empty>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-ink">{c.title_bn}</h3>
                <span className="badge badge-pending shrink-0">{c.status}</span>
              </div>
              {c.description_bn && (
                <p className="text-sm text-ink-muted line-clamp-2">{c.description_bn}</p>
              )}
              <ProgressBar percent={c.progress_percent} />
              <div className="flex flex-wrap justify-between gap-2 mt-2 text-xs">
                <span className="text-ink-muted">লক্ষ্য <span className="text-ink">{formatTaka(c.target_paisa)}</span></span>
                <span className="text-ink-muted">সংগৃহীত <span style={{ color: 'var(--color-verified)' }}>{formatTaka(c.received_paisa)}</span></span>
                <span className="text-ink-muted">বাকি <span className="text-ink">{formatTaka(c.remaining_paisa)}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function ProjectsSection({ projects }: { projects: ProjectSummary[] }) {
  return (
    <Section id="projects" title="প্রকল্পসমূহ">
      {projects.length === 0 ? (
        <Empty>কোনো প্রকল্পের তথ্য প্রকাশ করা হয়নি।</Empty>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-ink">{p.title_bn}</h3>
                <span className="badge badge-pending shrink-0">{p.status}</span>
              </div>
              {p.description_bn && (
                <p className="text-sm text-ink-muted line-clamp-2">{p.description_bn}</p>
              )}
              <ProgressBar percent={p.progress_percent} />
              <div className="flex flex-wrap justify-between gap-2 mt-2 text-xs">
                <span className="text-ink-muted">অগ্রগতি <span className="text-ink">{toBanglaDigits(p.progress_percent)}%</span></span>
                <span className="text-ink-muted">বাজেট <span className="text-ink">{formatTaka(p.budget_paisa)}</span></span>
                <span className="text-ink-muted">ব্যয় <span className="text-ink">{formatTaka(p.spent_paisa)}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function DocumentsSection({ documents }: { documents: PublicDocument[] }) {
  return (
    <Section id="documents" title="প্রকাশিত নথি">
      {documents.length === 0 ? (
        <Empty>সর্বসাধারণের জন্য কোনো নথি প্রকাশ করা হয়নি।</Empty>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-border">
            {documents.map((d) => (
              <li key={d.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{d.title_bn}</p>
                  <p className="text-xs text-ink-faint">
                    {d.doc_type} · {new Date(d.created_at).toLocaleDateString('bn-BD')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// ============================================================
// Report incorrect information — reuses correction_requests
// ============================================================
export function ReportSection({ masjidSlug }: { masjidSlug: string }) {
  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-ink">ভুল তথ্য দেখতে পেয়েছেন?</p>
        <p className="text-xs text-ink-muted">আপনার পরিচয় প্রকাশ করা হবে না।</p>
      </div>
      <Link href={`/masjid/${masjidSlug}/report`} className="btn btn-ghost btn-sm shrink-0">
        রিপোর্ট করুন
      </Link>
    </div>
  );
}
