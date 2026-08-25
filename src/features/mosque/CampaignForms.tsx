'use client';

import { useActionState } from 'react';
import {
  Field, TextArea, Select, Checkbox, SubmitButton, FormMessage, ConfirmDelete, Disclosure,
  type ActionState,
} from '@/components/form/Fields';
import {
  saveCampaign, deleteCampaign, recordDonation,
  saveProject, deleteProject, recordProjectExpense, addProjectUpdate,
  uploadDocument, toggleDocumentVisibility, deleteDocument,
} from './campaign-actions';

const EMPTY: ActionState = {};

const CAMPAIGN_STATUS: Array<[string, string]> = [
  ['draft', 'খসড়া'], ['active', 'চলমান'], ['paused', 'স্থগিত'],
  ['completed', 'সম্পন্ন'], ['cancelled', 'বাতিল'], ['archived', 'সংরক্ষিত'],
];

const PROJECT_STATUS: Array<[string, string]> = [
  ['planned', 'পরিকল্পিত'], ['active', 'চলমান'], ['paused', 'স্থগিত'],
  ['completed', 'সম্পন্ন'], ['cancelled', 'বাতিল'],
];

const DOC_TYPES: Array<[string, string]> = [
  ['monthly_financial', 'মাসিক আর্থিক প্রতিবেদন'],
  ['annual_financial', 'বার্ষিক আর্থিক প্রতিবেদন'],
  ['audit', 'নিরীক্ষা প্রতিবেদন'],
  ['donation_report', 'দান প্রতিবেদন'],
  ['zakat_report', 'যাকাত প্রতিবেদন'],
  ['construction_invoice', 'নির্মাণ চালান'],
  ['utility_bill', 'ইউটিলিটি বিল'],
  ['grant', 'অনুদান নথি'],
  ['project_completion', 'প্রকল্প সমাপ্তি প্রতিবেদন'],
  ['committee_resolution', 'কমিটির সিদ্ধান্ত'],
  ['other', 'অন্যান্য'],
];

const takaHint = 'টাকায় লিখুন — যেমন ৮০০০০০';

// ============================================================
// Campaigns
// ============================================================
export interface CampaignValues {
  id: string; title_bn: string; title_en: string | null; description_bn: string | null;
  target_paisa: number; start_date: string | null; end_date: string | null;
  status: string; completion_report_bn: string | null;
}

export function CampaignForm({
  masjidId, campaign,
}: { masjidId: string; campaign?: CampaignValues }) {
  const [state, action] = useActionState(saveCampaign, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      {campaign && <input type="hidden" name="campaign_id" value={campaign.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="title_bn" label="শিরোনাম" defaultValue={campaign?.title_bn} required
          placeholder="ছাদ সংস্কার তহবিল" />
        <Field name="title_en" label="শিরোনাম (ইংরেজি)" defaultValue={campaign?.title_en} latin />
        <Field name="target" label="লক্ষ্য (৳)" required hint={takaHint}
          defaultValue={campaign ? String(campaign.target_paisa / 100) : ''} latin />
        <Select name="status" label="অবস্থা" defaultValue={campaign?.status ?? 'draft'} options={CAMPAIGN_STATUS} />
        <Field name="start_date" label="শুরুর তারিখ" type="date" defaultValue={campaign?.start_date} latin />
        <Field name="end_date" label="শেষের তারিখ" type="date" defaultValue={campaign?.end_date} latin />
      </div>

      <TextArea name="description_bn" label="বিবরণ" defaultValue={campaign?.description_bn} rows={4} />
      {campaign?.status === 'completed' && (
        <TextArea name="completion_report_bn" label="সমাপ্তি প্রতিবেদন"
          defaultValue={campaign?.completion_report_bn} rows={4} />
      )}

      <p className="text-xs text-ink-faint">
        সংগৃহীত অর্থ এখানে লেখা যায় না — এটি অনুমোদিত দানের রেকর্ড থেকে স্বয়ংক্রিয়ভাবে হিসাব হয়।
      </p>

      <SubmitButton label={campaign ? 'হালনাগাদ করুন' : 'তৈরি করুন'} />
    </form>
  );
}

export function CampaignDelete({ masjidId, campaignId }: { masjidId: string; campaignId: string }) {
  const [, action] = useActionState(deleteCampaign, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, campaign_id: campaignId }} />;
}

export function DonationForm({
  masjidId, campaigns,
}: { masjidId: string; campaigns: Array<{ id: string; title_bn: string }> }) {
  const [state, action] = useActionState(recordDonation, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select name="campaign_id" label="কর্মসূচি"
          options={[['', '— সাধারণ দান —'], ...campaigns.map((c) => [c.id, c.title_bn] as [string, string])]} />
        <Field name="amount" label="পরিমাণ (৳)" required hint={takaHint} latin />
        <Field name="received_on" label="তারিখ" type="date" required
          defaultValue={new Date().toISOString().split('T')[0]} latin />
        <Field name="reference" label="রসিদ নং" latin />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="private_donor_name" label="দাতার নাম" />
        <Field name="private_donor_contact" label="দাতার যোগাযোগ" latin />
      </div>

      <Checkbox name="named_publicly" label="দাতার নাম প্রকাশ করা যাবে" tone="warning"
        hint="🔒 না দিলে দানটি বেনামে গণ্য হবে। দাতার তথ্য কখনো সর্বজনীন পাতায় দেখানো হয় না।" />
      <Checkbox name="approve" label="অনুমোদন করুন" defaultChecked
        hint="অনুমোদিত হলেই কর্মসূচির সংগৃহীত মোটে যোগ হবে।" />

      <SubmitButton label="দান যুক্ত করুন" />
    </form>
  );
}

// ============================================================
// Projects
// ============================================================
export interface ProjectValues {
  id: string; title_bn: string; title_en: string | null; description_bn: string | null;
  estimated_budget_paisa: number | null; progress_percent: number;
  start_date: string | null; expected_completion: string | null; actual_completion: string | null;
  vendor_name: string | null; status: string; is_published: boolean;
  completion_report_bn: string | null;
}

export function ProjectForm({ masjidId, project }: { masjidId: string; project?: ProjectValues }) {
  const [state, action] = useActionState(saveProject, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      {project && <input type="hidden" name="project_id" value={project.id} />}
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="title_bn" label="শিরোনাম" defaultValue={project?.title_bn} required
          placeholder="ওজুখানা নির্মাণ" />
        <Field name="title_en" label="শিরোনাম (ইংরেজি)" defaultValue={project?.title_en} latin />
        <Field name="estimated_budget" label="আনুমানিক বাজেট (৳)" hint={takaHint} latin
          defaultValue={project?.estimated_budget_paisa ? String(project.estimated_budget_paisa / 100) : ''} />
        <Select name="status" label="অবস্থা" defaultValue={project?.status ?? 'planned'} options={PROJECT_STATUS} />
        <Field name="progress_percent" label="অগ্রগতি (%)" type="number" min={0} max={100}
          defaultValue={project?.progress_percent ?? 0} latin />
        <Field name="vendor_name" label="ঠিকাদার / সরবরাহকারী" defaultValue={project?.vendor_name} />
        <Field name="start_date" label="শুরুর তারিখ" type="date" defaultValue={project?.start_date} latin />
        <Field name="expected_completion" label="সম্ভাব্য সমাপ্তি" type="date"
          defaultValue={project?.expected_completion} latin />
        <Field name="actual_completion" label="প্রকৃত সমাপ্তি" type="date"
          defaultValue={project?.actual_completion} latin />
      </div>

      <TextArea name="description_bn" label="বিবরণ" defaultValue={project?.description_bn} rows={4} />
      {project?.status === 'completed' && (
        <TextArea name="completion_report_bn" label="সমাপ্তি প্রতিবেদন"
          defaultValue={project?.completion_report_bn} rows={4} />
      )}

      <Checkbox name="is_published" label="সর্বসাধারণের জন্য প্রকাশ করুন"
        defaultChecked={project?.is_published} />

      <p className="text-xs text-ink-faint">
        ব্যয়ের মোট এখানে লেখা যায় না — অনুমোদিত ব্যয়ের রেকর্ড থেকে হিসাব হয়।
      </p>

      <SubmitButton label={project ? 'হালনাগাদ করুন' : 'তৈরি করুন'} />
    </form>
  );
}

export function ProjectDelete({ masjidId, projectId }: { masjidId: string; projectId: string }) {
  const [, action] = useActionState(deleteProject, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, project_id: projectId }} />;
}

export function ProjectExpenseForm({
  masjidId, projectId,
}: { masjidId: string; projectId: string }) {
  const [state, action] = useActionState(recordProjectExpense, EMPTY);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <input type="hidden" name="project_id" value={projectId} />
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-3 gap-3">
        <Field name="amount" label="ব্যয় (৳)" required hint={takaHint} latin />
        <Field name="spent_on" label="তারিখ" type="date" required
          defaultValue={new Date().toISOString().split('T')[0]} latin />
        <Field name="description_bn" label="বিবরণ" />
      </div>
      <Checkbox name="approve" label="অনুমোদন করুন" defaultChecked
        hint="অনুমোদিত ব্যয়ই মোট ব্যয়ে গণনা হয়।" />
      <SubmitButton label="ব্যয় যুক্ত করুন" className="btn btn-secondary btn-sm" />
    </form>
  );
}

export function ProjectUpdateForm({
  masjidId, projectId,
}: { masjidId: string; projectId: string }) {
  const [state, action] = useActionState(addProjectUpdate, EMPTY);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <input type="hidden" name="project_id" value={projectId} />
      <FormMessage state={state} />

      <TextArea name="note_bn" label="অগ্রগতির বিবরণ" required rows={2}
        placeholder="ছাদ ঢালাইয়ের কাজ সম্পন্ন হয়েছে।" />
      <Field name="progress_percent" label="অগ্রগতি (%)" type="number" min={0} max={100} latin
        hint="দিলে প্রকল্পের মূল অগ্রগতিও হালনাগাদ হবে।" />
      <SubmitButton label="অগ্রগতি যুক্ত করুন" className="btn btn-secondary btn-sm" />
    </form>
  );
}

// ============================================================
// Documents
// ============================================================
export interface DocumentValues {
  id: string; title_bn: string; title_en: string | null; doc_type: string;
  description_bn: string | null; is_public: boolean; verification_status: string;
  file_size_bytes: number | null; mime_type: string | null; created_at: string;
  period_start: string | null; period_end: string | null;
}

export function DocumentUploadForm({ masjidId }: { masjidId: string }) {
  const [state, action] = useActionState(uploadDocument, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <FormMessage state={state} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="title_bn" label="শিরোনাম" required placeholder="জুলাই ২০২৬ আর্থিক প্রতিবেদন" />
        <Select name="doc_type" label="ধরন" defaultValue="monthly_financial" options={DOC_TYPES} />
        <Field name="period_start" label="সময়কাল শুরু" type="date" latin />
        <Field name="period_end" label="সময়কাল শেষ" type="date" latin />
      </div>

      <TextArea name="description_bn" label="বিবরণ" rows={2} />

      <div>
        <label htmlFor="f-file" className="block text-sm font-medium text-ink mb-1.5">
          ফাইল <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          id="f-file"
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
          className="input"
          aria-describedby="file-hint"
        />
        <p id="file-hint" className="text-xs text-ink-faint mt-1">
          PDF, ছবি বা এক্সেল — সর্বোচ্চ ১০ MB।
        </p>
      </div>

      <Checkbox name="is_public" label="সর্বসাধারণের জন্য প্রকাশ করুন" tone="warning"
        hint="🔒 না দিলে নথিটি শুধু মসজিদের দল দেখতে পাবে। ইউটিলিটি বিল বা চালানের মতো নথি ব্যক্তিগত রাখাই স্বাভাবিক।" />

      <SubmitButton label="আপলোড করুন" />
    </form>
  );
}

export function DocumentVisibilityToggle({
  masjidId, documentId, isPublic,
}: { masjidId: string; documentId: string; isPublic: boolean }) {
  const [, action] = useActionState(toggleDocumentVisibility, EMPTY);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="masjid_id" value={masjidId} />
      <input type="hidden" name="document_id" value={documentId} />
      <SubmitButton
        label={isPublic ? 'ব্যক্তিগত করুন' : 'প্রকাশ করুন'}
        pendingLabel="…"
        className="btn btn-ghost btn-sm"
      />
    </form>
  );
}

export function DocumentDelete({ masjidId, documentId }: { masjidId: string; documentId: string }) {
  const [, action] = useActionState(deleteDocument, EMPTY);
  return <ConfirmDelete action={action} hidden={{ masjid_id: masjidId, document_id: documentId }} />;
}

export { Disclosure };
