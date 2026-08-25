'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import slugify from 'slugify';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { assertMosqueCapability, AuthorizationError, getCurrentUser } from '@/lib/auth/dal';
import { parseTakaToPaisa } from '@/lib/services/mosque.service';
import type { MosqueCapability } from '@/types/mosque-admin';

/**
 * Campaigns, projects and documents.
 *
 * No total is ever written from a form: a campaign's received amount and a
 * project's spend are summed from donations and project_expenses by the SQL
 * functions in 00013. The forms below can only add the underlying records.
 */

export interface ActionState {
  error?: string;
  success?: string;
}

const ok = (success: string): ActionState => ({ success });
const fail = (error: string): ActionState => ({ error });

async function guard(
  masjidId: string,
  capability: MosqueCapability,
  run: () => Promise<ActionState>
): Promise<ActionState> {
  if (!masjidId) return fail('মসজিদ শনাক্ত করা যায়নি।');
  try {
    await assertMosqueCapability(masjidId, capability);
    return await run();
  } catch (err) {
    if (err instanceof AuthorizationError) return fail(err.message);
    console.error('Campaign action failed:', err);
    return fail('কাজটি সম্পন্ন করা যায়নি।');
  }
}

const optText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || null);
const optDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional().or(z.literal('')).transform((v) => v || null);

const amount = z.string().trim().min(1, 'পরিমাণ দিন।').transform((v, ctx) => {
  const paisa = parseTakaToPaisa(v);
  if (paisa === null || paisa <= 0) {
    ctx.addIssue({ code: 'custom', message: 'পরিমাণ সঠিক নয়।' });
    return z.NEVER;
  }
  return paisa;
});

const checkbox = (fd: FormData, n: string) => fd.get(n) === 'on';
const slugFor = (s: string, fb: string) =>
  `${slugify(s || fb, { lower: true, strict: true }) || fb}-${Date.now().toString(36)}`;

function revalidateMosque(masjidId: string) {
  revalidatePath(`/dashboard/mosque/${masjidId}`, 'layout');
  revalidatePath('/masjid');
}

// ============================================================
// Campaigns
// ============================================================
const campaignSchema = z.object({
  title_bn: z.string().trim().min(2, 'শিরোনাম আবশ্যক।').max(300),
  title_en: optText(300),
  description_bn: optText(5000),
  target: amount,
  start_date: optDate,
  end_date: optDate,
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled', 'archived']),
  completion_report_bn: optText(5000),
});

export async function saveCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');

  return guard(masjidId, 'manage_campaigns', async () => {
    const parsed = campaignSchema.safeParse({
      title_bn: formData.get('title_bn'),
      title_en: formData.get('title_en') ?? '',
      description_bn: formData.get('description_bn') ?? '',
      target: formData.get('target'),
      start_date: formData.get('start_date') ?? '',
      end_date: formData.get('end_date') ?? '',
      status: formData.get('status') || 'draft',
      completion_report_bn: formData.get('completion_report_bn') ?? '',
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const { target, ...rest } = parsed.data;
    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    // target_paisa is a goal the mosque sets; received_paisa does not exist as
    // a column and is derived by campaign_totals().
    const row = { masjid_id: masjidId, ...rest, target_paisa: target, created_by: user?.id ?? null };

    const { error } = campaignId
      ? await supabase.from('donation_campaigns').update(row).eq('id', campaignId).eq('masjid_id', masjidId)
      : await supabase.from('donation_campaigns').insert({
          ...row, slug: slugFor(parsed.data.title_en || parsed.data.title_bn, 'campaign'),
        });

    if (error) {
      console.error('Campaign save failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    revalidateMosque(masjidId);
    return ok(campaignId ? 'কর্মসূচি হালনাগাদ হয়েছে।' : 'কর্মসূচি তৈরি হয়েছে।');
  });
}

export async function deleteCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');

  return guard(masjidId, 'manage_campaigns', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('donation_campaigns').delete().eq('id', campaignId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি। এই কর্মসূচির অধীনে দান থাকতে পারে।');
    revalidateMosque(masjidId);
    return ok('মুছে ফেলা হয়েছে।');
  });
}

// ============================================================
// Donations — the records campaign totals are derived from
// ============================================================
const donationSchema = z.object({
  campaign_id: optText(64),
  amount: amount,
  received_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'তারিখ সঠিক নয়।'),
  reference: optText(120),
  private_donor_name: optText(200),
  private_donor_contact: optText(120),
});

export async function recordDonation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');

  return guard(masjidId, 'manage_campaigns', async () => {
    const parsed = donationSchema.safeParse({
      campaign_id: formData.get('campaign_id') ?? '',
      amount: formData.get('amount'),
      received_on: formData.get('received_on'),
      reference: formData.get('reference') ?? '',
      private_donor_name: formData.get('private_donor_name') ?? '',
      private_donor_contact: formData.get('private_donor_contact') ?? '',
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('donations').insert({
      masjid_id: masjidId,
      campaign_id: parsed.data.campaign_id || null,
      amount_paisa: parsed.data.amount,
      received_on: parsed.data.received_on,
      reference: parsed.data.reference,
      // Donor identity is private by default and has no public RLS policy.
      private_donor_name: parsed.data.private_donor_name,
      private_donor_contact: parsed.data.private_donor_contact,
      is_anonymous: !checkbox(formData, 'named_publicly'),
      approval: checkbox(formData, 'approve') ? 'approved' : 'draft',
      created_by: user?.id ?? null,
    });

    if (error) {
      console.error('Donation insert failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    revalidateMosque(masjidId);
    return ok(
      checkbox(formData, 'approve')
        ? 'দান যুক্ত হয়েছে এবং কর্মসূচির মোটে গণনা হয়েছে।'
        : 'দান খসড়া হিসেবে যুক্ত হয়েছে — অনুমোদনের পর মোটে যোগ হবে।'
    );
  });
}

// ============================================================
// Projects
// ============================================================
const projectSchema = z.object({
  title_bn: z.string().trim().min(2, 'শিরোনাম আবশ্যক।').max(300),
  title_en: optText(300),
  description_bn: optText(5000),
  estimated_budget: z.string().trim().optional().or(z.literal('')),
  progress_percent: z.coerce.number().int().min(0).max(100).default(0),
  start_date: optDate,
  expected_completion: optDate,
  actual_completion: optDate,
  vendor_name: optText(200),
  status: z.enum(['planned', 'active', 'paused', 'completed', 'cancelled']),
  completion_report_bn: optText(5000),
});

export async function saveProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const projectId = String(formData.get('project_id') ?? '');

  return guard(masjidId, 'manage_projects', async () => {
    const parsed = projectSchema.safeParse({
      title_bn: formData.get('title_bn'),
      title_en: formData.get('title_en') ?? '',
      description_bn: formData.get('description_bn') ?? '',
      estimated_budget: formData.get('estimated_budget') ?? '',
      progress_percent: formData.get('progress_percent') || 0,
      start_date: formData.get('start_date') ?? '',
      expected_completion: formData.get('expected_completion') ?? '',
      actual_completion: formData.get('actual_completion') ?? '',
      vendor_name: formData.get('vendor_name') ?? '',
      status: formData.get('status') || 'planned',
      completion_report_bn: formData.get('completion_report_bn') ?? '',
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const { estimated_budget, ...rest } = parsed.data;
    const budgetPaisa = estimated_budget ? parseTakaToPaisa(estimated_budget) : null;
    if (estimated_budget && budgetPaisa === null) return fail('বাজেট সঠিক নয়।');

    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    // No spent/raised columns: project_totals() sums approved expenses.
    const row = {
      masjid_id: masjidId,
      ...rest,
      estimated_budget_paisa: budgetPaisa,
      is_published: checkbox(formData, 'is_published'),
      created_by: user?.id ?? null,
    };

    const { error } = projectId
      ? await supabase.from('mosque_projects').update(row).eq('id', projectId).eq('masjid_id', masjidId)
      : await supabase.from('mosque_projects').insert({
          ...row, slug: slugFor(parsed.data.title_en || parsed.data.title_bn, 'project'),
        });

    if (error) {
      console.error('Project save failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    revalidateMosque(masjidId);
    return ok(projectId ? 'প্রকল্প হালনাগাদ হয়েছে।' : 'প্রকল্প তৈরি হয়েছে।');
  });
}

export async function deleteProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const projectId = String(formData.get('project_id') ?? '');

  return guard(masjidId, 'manage_projects', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('mosque_projects').delete().eq('id', projectId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি।');
    revalidateMosque(masjidId);
    return ok('মুছে ফেলা হয়েছে।');
  });
}

export async function recordProjectExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const projectId = String(formData.get('project_id') ?? '');

  return guard(masjidId, 'manage_projects', async () => {
    const parsedAmount = parseTakaToPaisa(String(formData.get('amount') ?? ''));
    const spentOn = String(formData.get('spent_on') ?? '');
    if (!parsedAmount || parsedAmount <= 0) return fail('পরিমাণ সঠিক নয়।');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) return fail('তারিখ সঠিক নয়।');

    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('project_expenses').insert({
      project_id: projectId,
      masjid_id: masjidId,
      amount_paisa: parsedAmount,
      spent_on: spentOn,
      description_bn: String(formData.get('description_bn') ?? '').trim() || null,
      approval: checkbox(formData, 'approve') ? 'approved' : 'draft',
      created_by: user?.id ?? null,
    });

    if (error) return fail('সংরক্ষণ করা যায়নি।');
    revalidateMosque(masjidId);
    return ok('ব্যয় যুক্ত হয়েছে।');
  });
}

export async function addProjectUpdate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const projectId = String(formData.get('project_id') ?? '');

  return guard(masjidId, 'manage_projects', async () => {
    const note = String(formData.get('note_bn') ?? '').trim();
    if (note.length < 2) return fail('অগ্রগতির বিবরণ দিন।');

    const progressRaw = formData.get('progress_percent');
    const progress = progressRaw ? Number(progressRaw) : null;
    if (progress !== null && (!Number.isInteger(progress) || progress < 0 || progress > 100)) {
      return fail('অগ্রগতি ০-১০০ এর মধ্যে হতে হবে।');
    }

    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('project_updates').insert({
      project_id: projectId,
      masjid_id: masjidId,
      note_bn: note,
      progress_percent: progress,
      is_published: true,
      created_by: user?.id ?? null,
    });
    if (error) return fail('সংরক্ষণ করা যায়নি।');

    // Keep the project's headline percentage in step with its latest update.
    if (progress !== null) {
      await supabase.from('mosque_projects')
        .update({ progress_percent: progress }).eq('id', projectId).eq('masjid_id', masjidId);
    }

    revalidateMosque(masjidId);
    return ok('অগ্রগতি যুক্ত হয়েছে।');
  });
}

// ============================================================
// Documents
// ============================================================
const DOC_TYPES = [
  'monthly_financial', 'annual_financial', 'audit', 'donation_report',
  'zakat_report', 'construction_invoice', 'utility_bill', 'grant',
  'project_completion', 'committee_resolution', 'other',
] as const;

const ALLOWED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);
const EXT_FOR: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};
const MAX_DOC_BYTES = 10 * 1024 * 1024;

const documentSchema = z.object({
  title_bn: z.string().trim().min(2, 'শিরোনাম আবশ্যক।').max(300),
  title_en: optText(300),
  doc_type: z.enum(DOC_TYPES),
  description_bn: optText(2000),
  period_start: optDate,
  period_end: optDate,
});

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');

  return guard(masjidId, 'manage_documents', async () => {
    const parsed = documentSchema.safeParse({
      title_bn: formData.get('title_bn'),
      title_en: formData.get('title_en') ?? '',
      doc_type: formData.get('doc_type') || 'other',
      description_bn: formData.get('description_bn') ?? '',
      period_start: formData.get('period_start') ?? '',
      period_end: formData.get('period_end') ?? '',
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।');

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return fail('একটি ফাইল নির্বাচন করুন।');
    // Re-validated server-side: the accept attribute is a hint, not a control.
    if (!ALLOWED_MIME.has(file.type)) return fail('শুধু PDF, ছবি বা এক্সেল ফাইল দেওয়া যাবে।');
    if (file.size > MAX_DOC_BYTES) return fail('ফাইলের আকার ১০ MB এর বেশি হতে পারবে না।');

    const user = await getCurrentUser();
    const supabase = await createServerSupabaseClient();

    // The first path segment must be the mosque id — the storage RLS policy
    // reads it back out to decide whether this user may write here.
    const ext = EXT_FOR[file.type] ?? 'bin';
    const path = `${masjidId}/${Date.now().toString(36)}-${Math.abs(hash(parsed.data.title_bn))}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('mosque-documents')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('Document upload failed:', uploadError.message);
      return fail('ফাইল আপলোড করা যায়নি।');
    }

    const { error } = await supabase.from('mosque_documents').insert({
      masjid_id: masjidId,
      ...parsed.data,
      file_path: path,
      file_size_bytes: file.size,
      mime_type: file.type,
      // Publishing is a two-step decision: uploading does not expose anything.
      is_public: checkbox(formData, 'is_public'),
      verification_status: checkbox(formData, 'is_public') ? 'approved' : 'pending',
      uploaded_by: user?.id ?? null,
    });

    if (error) {
      // Roll the file back so storage does not accumulate orphans.
      await supabase.storage.from('mosque-documents').remove([path]);
      console.error('Document row insert failed:', error.message);
      return fail('সংরক্ষণ করা যায়নি।');
    }

    revalidateMosque(masjidId);
    return ok(checkbox(formData, 'is_public') ? 'নথি প্রকাশিত হয়েছে।' : 'নথি সংরক্ষিত হয়েছে (ব্যক্তিগত)।');
  });
}

/** Small stable hash so filenames differ without leaking the title. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export async function toggleDocumentVisibility(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const docId = String(formData.get('document_id') ?? '');

  return guard(masjidId, 'manage_documents', async () => {
    const supabase = await createServerSupabaseClient();
    const { data: current } = await supabase
      .from('mosque_documents').select('is_public').eq('id', docId).maybeSingle();

    const next = !current?.is_public;
    const { error } = await supabase
      .from('mosque_documents')
      .update({ is_public: next, verification_status: next ? 'approved' : 'pending' })
      .eq('id', docId).eq('masjid_id', masjidId);

    if (error) return fail('পরিবর্তন করা যায়নি।');
    revalidateMosque(masjidId);
    return ok(next ? 'নথি প্রকাশিত হয়েছে।' : 'নথি ব্যক্তিগত করা হয়েছে।');
  });
}

export async function deleteDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const masjidId = String(formData.get('masjid_id') ?? '');
  const docId = String(formData.get('document_id') ?? '');

  return guard(masjidId, 'manage_documents', async () => {
    const supabase = await createServerSupabaseClient();

    const { data: doc } = await supabase
      .from('mosque_documents').select('file_path').eq('id', docId).maybeSingle();

    const { error } = await supabase
      .from('mosque_documents').delete().eq('id', docId).eq('masjid_id', masjidId);
    if (error) return fail('মুছে ফেলা যায়নি।');

    // Remove the file too; a deleted record must not leave the PDF reachable.
    if (doc?.file_path) {
      await supabase.storage.from('mosque-documents').remove([doc.file_path]);
    }

    revalidateMosque(masjidId);
    return ok('মুছে ফেলা হয়েছে।');
  });
}
