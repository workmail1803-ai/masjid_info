import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/auth/dal';
import type { MasjidSubmission } from '@/types/database';
import { ApproveForm, RejectForm } from '@/features/admin/SubmissionReview';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionReviewPage({ params }: PageProps) {
  await requireModerator('/admin/submissions');
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: submission } = await supabase
    .from('masjid_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (!submission) notFound();

  const s = submission as MasjidSubmission;

  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'মসজিদের নাম (বাংলা)', value: s.name_bn },
    { label: 'মসজিদের নাম (ইংরেজি)', value: s.name_en },
    { label: 'এলাকা', value: s.area_name_bn },
    { label: 'ঠিকানা', value: s.address_bn },
    { label: 'কাঠামো', value: s.structure_type },
    { label: 'প্রতিষ্ঠার বছর', value: s.established_year },
    { label: 'বিবরণ', value: s.description_bn },
    { label: 'যোগাযোগ নম্বর', value: s.contact_number },
    { label: 'ইমেইল', value: s.email },
    { label: 'অক্ষাংশ', value: s.latitude },
    { label: 'দ্রাঘিমাংশ', value: s.longitude },
    { label: 'জমা দানকারীর নাম', value: s.submitter_name },
    { label: 'জমা দানকারীর যোগাযোগ', value: s.submitter_contact },
    { label: 'সূত্র', value: s.source_info },
  ];

  const statusColors: Record<string, string> = {
    pending_review: 'badge-pending',
    approved: 'badge-verified',
    rejected: 'badge-unverified',
    merged: 'badge-verified',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/submissions" className="btn btn-ghost btn-sm">← ফিরে যান</Link>
        <h1 className="text-xl font-bold text-ink">জমা পর্যালোচনা</h1>
        <span className={`badge ${statusColors[s.status] || 'badge-pending'}`}>{s.status}</span>
      </div>

      {/* Submission Details */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-ink mb-4">জমাকৃত তথ্য</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="text-sm text-ink mt-0.5">{value || <span className="text-ink-faint">—</span>}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-ink-muted">
            জমা দেওয়া হয়েছে: {new Date(s.created_at).toLocaleString('bn-BD')}
          </div>
          {s.admin_notes && (
            <div className="mt-2 text-sm text-ink-muted bg-surface-alt rounded-md p-3">
              <span className="font-medium">অ্যাডমিন মন্তব্য:</span> {s.admin_notes}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {s.status === 'pending_review' && (
        <div className="card p-6">
          <h2 className="font-semibold text-ink mb-4">পদক্ষেপ নিন</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <ApproveForm id={s.id} />
            </div>
            <div className="flex-1">
              <RejectForm id={s.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
