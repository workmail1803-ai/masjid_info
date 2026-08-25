'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { assertMosqueCapability, AuthorizationError } from '@/lib/auth/dal';
import { parseTakaToPaisa } from '@/lib/services/mosque.service';

export interface ActionState {
  error?: string;
  success?: string;
}

/**
 * Finance & Zakat writes.
 *
 * Every action authorizes against the DATABASE via assertMosqueCapability()
 * before touching a row, and the RLS policies on these tables re-check the same
 * capability. Two independent gates, because Server Actions are POST-reachable
 * from anywhere.
 *
 * Amounts arrive as text and are converted to integer paisa server-side. A
 * client-submitted total is never trusted — see the derived-total SQL functions.
 */

const amountField = z
  .string()
  .trim()
  .min(1, 'পরিমাণ দিন।')
  .transform((v, ctx) => {
    const paisa = parseTakaToPaisa(v);
    if (paisa === null || paisa <= 0) {
      ctx.addIssue({ code: 'custom', message: 'পরিমাণ সঠিক নয়।' });
      return z.NEVER;
    }
    return paisa;
  });

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'তারিখ সঠিক নয়।');
const optText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || null);

async function guard<T>(
  masjidId: string,
  capability: Parameters<typeof assertMosqueCapability>[1],
  run: () => Promise<T>
): Promise<T | ActionState> {
  try {
    await assertMosqueCapability(masjidId, capability);
    return await run();
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error('Finance action failed:', err);
    return { error: 'কাজটি সম্পন্ন করা যায়নি।' };
  }
}

// ============================================================
// Financial transaction
// ============================================================
const txnSchema = z.object({
  masjid_id: z.string().uuid(),
  direction: z.enum(['income', 'expense']),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  amount: amountField,
  occurred_on: dateField,
  description_bn: optText(1000),
  reference: optText(120),
});

export async function createTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = txnSchema.safeParse({
    masjid_id: formData.get('masjid_id'),
    direction: formData.get('direction'),
    category_id: formData.get('category_id') || null,
    amount: formData.get('amount'),
    occurred_on: formData.get('occurred_on'),
    description_bn: formData.get('description_bn') ?? '',
    reference: formData.get('reference') ?? '',
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  const d = parsed.data;

  return guard(d.masjid_id, 'manage_finance', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('financial_transactions').insert({
      masjid_id: d.masjid_id,
      direction: d.direction,
      category_id: d.category_id ?? null,
      amount_paisa: d.amount,
      occurred_on: d.occurred_on,
      description_bn: d.description_bn,
      reference: d.reference,
      // New entries start as drafts. Publishing is a separate, deliberate step.
      approval: 'draft',
      is_published: false,
    });

    if (error) {
      console.error('Transaction insert failed:', error.message);
      return { error: 'সংরক্ষণ করা যায়নি।' };
    }

    revalidatePath(`/dashboard/mosque/${d.masjid_id}/finance`);
    return { success: 'লেনদেন সংরক্ষিত হয়েছে (খসড়া)।' };
  }) as Promise<ActionState>;
}

/** Approve + publish in one deliberate step, recorded in the audit log. */
export async function publishTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('txn_id') ?? '');
  const masjidId = String(formData.get('masjid_id') ?? '');
  if (!id || !masjidId) return { error: 'তথ্য সঠিক নয়।' };

  return guard(masjidId, 'publish_finance', async () => {
    const supabase = await createServerSupabaseClient();

    const { data: before } = await supabase
      .from('financial_transactions')
      .select('amount_paisa, direction, approval')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('financial_transactions')
      .update({ approval: 'approved', is_published: true, approved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('masjid_id', masjidId);

    if (error) {
      console.error('Publish failed:', error.message);
      return { error: 'প্রকাশ করা যায়নি।' };
    }

    await supabase.from('audit_logs').insert({
      action: 'approve',
      entity_type: 'financial_transaction',
      entity_id: id,
      previous_data: before ?? null,
      new_data: { approval: 'approved', is_published: true },
    });

    revalidatePath(`/dashboard/mosque/${masjidId}/finance`);
    return { success: 'লেনদেন প্রকাশিত হয়েছে।' };
  }) as Promise<ActionState>;
}

export async function deleteTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('txn_id') ?? '');
  const masjidId = String(formData.get('masjid_id') ?? '');
  if (!id || !masjidId) return { error: 'তথ্য সঠিক নয়।' };

  return guard(masjidId, 'manage_finance', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('financial_transactions').delete().eq('id', id).eq('masjid_id', masjidId);
    if (error) return { error: 'মুছে ফেলা যায়নি।' };

    await supabase.from('audit_logs').insert({
      action: 'delete', entity_type: 'financial_transaction', entity_id: id,
    });

    revalidatePath(`/dashboard/mosque/${masjidId}/finance`);
    return { success: 'মুছে ফেলা হয়েছে।' };
  }) as Promise<ActionState>;
}

// ============================================================
// Zakat
// ============================================================
const zakatReceiveSchema = z.object({
  masjid_id: z.string().uuid(),
  amount: amountField,
  received_on: dateField,
  description_bn: optText(1000),
});

export async function recordZakatReceived(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = zakatReceiveSchema.safeParse({
    masjid_id: formData.get('masjid_id'),
    amount: formData.get('amount'),
    received_on: formData.get('received_on'),
    description_bn: formData.get('description_bn') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  const d = parsed.data;

  return guard(d.masjid_id, 'manage_zakat', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('zakat_transactions').insert({
      masjid_id: d.masjid_id,
      amount_paisa: d.amount,
      received_on: d.received_on,
      description_bn: d.description_bn,
      approval: 'draft',
      is_published: false,
    });
    if (error) return { error: 'সংরক্ষণ করা যায়নি।' };

    revalidatePath(`/dashboard/mosque/${d.masjid_id}/zakat`);
    return { success: 'যাকাত গ্রহণ সংরক্ষিত হয়েছে (খসড়া)।' };
  }) as Promise<ActionState>;
}

const zakatDistributeSchema = z.object({
  masjid_id: z.string().uuid(),
  category: z.enum(['poor_needy', 'students', 'emergency', 'debt_relief', 'travellers', 'other']),
  amount: amountField,
  beneficiary_count: z.coerce.number().int().min(1, 'উপকারভোগীর সংখ্যা দিন।'),
  distributed_on: dateField,
  description_bn: optText(1000),
  private_recipient_note: optText(2000),
});

export async function recordZakatDistribution(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = zakatDistributeSchema.safeParse({
    masjid_id: formData.get('masjid_id'),
    category: formData.get('category'),
    amount: formData.get('amount'),
    beneficiary_count: formData.get('beneficiary_count'),
    distributed_on: formData.get('distributed_on'),
    description_bn: formData.get('description_bn') ?? '',
    private_recipient_note: formData.get('private_recipient_note') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  const d = parsed.data;

  return guard(d.masjid_id, 'manage_zakat', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('zakat_distributions').insert({
      masjid_id: d.masjid_id,
      category: d.category,
      amount_paisa: d.amount,
      beneficiary_count: d.beneficiary_count,
      distributed_on: d.distributed_on,
      description_bn: d.description_bn,
      // Confidential. Never rendered on a public page; no public RLS policy exists.
      private_recipient_note: d.private_recipient_note,
      approval: 'draft',
      is_published: false,
    });
    if (error) return { error: 'সংরক্ষণ করা যায়নি।' };

    revalidatePath(`/dashboard/mosque/${d.masjid_id}/zakat`);
    return { success: 'যাকাত বিতরণ সংরক্ষিত হয়েছে (খসড়া)।' };
  }) as Promise<ActionState>;
}

export async function publishZakat(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get('row_id') ?? '');
  const masjidId = String(formData.get('masjid_id') ?? '');
  const table = formData.get('table') === 'distribution'
    ? 'zakat_distributions' : 'zakat_transactions';
  if (!id || !masjidId) return { error: 'তথ্য সঠিক নয়।' };

  return guard(masjidId, 'manage_zakat', async () => {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from(table)
      .update({ approval: 'approved', is_published: true })
      .eq('id', id).eq('masjid_id', masjidId);
    if (error) return { error: 'প্রকাশ করা যায়নি।' };

    await supabase.from('audit_logs').insert({
      action: 'approve', entity_type: table, entity_id: id,
    });

    revalidatePath(`/dashboard/mosque/${masjidId}/zakat`);
    return { success: 'প্রকাশিত হয়েছে।' };
  }) as Promise<ActionState>;
}
