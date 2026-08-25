'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/dal';

export interface AuthFormState {
  error?: string;
  success?: string;
}

/**
 * Only allow redirects to same-origin paths. Without this check a crafted
 * `?redirect=https://evil.example` turns the login page into an open redirect.
 */
function safeRedirect(value: FormDataEntryValue | null): string {
  const raw = typeof value === 'string' ? value : '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/admin';
}

const credentialsSchema = z.object({
  email: z.string().email('সঠিক ইমেইল ঠিকানা দিন।'),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'),
});

const registerSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(2, 'পূর্ণ নাম দিন।').max(120),
});

// ============================================================
// Sign in
// ============================================================
export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately generic: distinguishing "no such user" from "wrong password"
    // lets an attacker enumerate registered email addresses.
    return { error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' };
  }

  revalidatePath('/', 'layout');
  redirect(safeRedirect(formData.get('redirect')));
}

// ============================================================
// Register
// ============================================================
export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  }

  const supabase = await createServerSupabaseClient();

  // `role` is never passed here. The handle_new_user() trigger creates the
  // profile with the default 'user' role, and the profiles RLS policy forbids
  // self-elevation, so a crafted signup payload cannot mint an admin.
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে।' };
    }
    return { error: 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।' };
  }

  revalidatePath('/', 'layout');
  return {
    success:
      'অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল যাচাই প্রয়োজন হলে আপনার ইনবক্স দেখুন, তারপর লগইন করুন।',
  };
}

// ============================================================
// Sign out
// ============================================================
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}

// ============================================================
// Claim a mosque — request administrator access
// ============================================================
const claimSchema = z.object({
  masjid_id: z.string().uuid('মসজিদ নির্বাচন সঠিক নয়।'),
  requested_role: z.enum([
    'chairman', 'secretary', 'treasurer', 'imam', 'muazzin', 'editor',
  ]),
  full_name: z.string().trim().min(2, 'পূর্ণ নাম দিন।').max(120),
  contact_phone: z.string().trim().max(20).optional().or(z.literal('')),
  contact_email: z.string().email('সঠিক ইমেইল দিন।').optional().or(z.literal('')),
  position_description: z.string().trim().max(1000).optional().or(z.literal('')),
  evidence_note: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function submitMosqueClaim(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'আবেদন করতে আগে লগইন করুন।' };
  }

  const parsed = claimSchema.safeParse({
    masjid_id: formData.get('masjid_id'),
    requested_role: formData.get('requested_role'),
    full_name: formData.get('full_name'),
    contact_phone: formData.get('contact_phone') ?? '',
    contact_email: formData.get('contact_email') ?? '',
    position_description: formData.get('position_description') ?? '',
    evidence_note: formData.get('evidence_note') ?? '',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'তথ্য সঠিক নয়।' };
  }

  const supabase = await createServerSupabaseClient();

  // user_id is taken from the verified session, never from the form. The
  // RLS policy on mosque_admin_claims also pins it to auth.uid().
  // `status` is left at its 'pending' default — a claimant cannot self-approve.
  const { error } = await supabase.from('mosque_admin_claims').insert({
    masjid_id: parsed.data.masjid_id,
    user_id: user.id,
    requested_role: parsed.data.requested_role,
    full_name: parsed.data.full_name,
    contact_phone: parsed.data.contact_phone || null,
    contact_email: parsed.data.contact_email || null,
    position_description: parsed.data.position_description || null,
    evidence_note: parsed.data.evidence_note || null,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'এই মসজিদের জন্য আপনার একটি আবেদন ইতিমধ্যে বিচারাধীন আছে।' };
    }
    console.error('Claim submission failed:', error.message);
    return { error: 'আবেদন জমা দেওয়া যায়নি। আবার চেষ্টা করুন।' };
  }

  revalidatePath('/dashboard');
  return {
    success:
      'আবেদন জমা হয়েছে। প্ল্যাটফর্ম প্রশাসক যাচাই করার পর আপনি মসজিদ ব্যবস্থাপনা প্যানেলে প্রবেশ করতে পারবেন।',
  };
}
