import { createStaticSupabaseClient } from '@/lib/supabase/static';

/**
 * Read layer for the mosque management system (migrations 00012–00013).
 *
 * Every public figure comes from a SECURITY DEFINER SQL function so the
 * derivation rules (approved + published only) live in one place. Nothing here
 * ever selects a private column — donor names, Zakat recipient notes and staff
 * personal numbers are unreachable through this module by construction.
 */

// ============================================================
// Money — stored as BIGINT paisa, never floats
// ============================================================

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Formats paisa as ৳-prefixed Bangla currency using the Indian grouping. */
export function formatTaka(paisa: number | string | null | undefined, bangla = true): string {
  const n = Number(paisa ?? 0) / 100;
  const grouped = n.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `৳${bangla ? toBanglaDigits(grouped) : grouped}`;
}

/** Parses a user-entered taka amount into integer paisa. */
export function parseTakaToPaisa(input: string): number | null {
  const normalized = input
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[,\s৳]/g, '')
    .trim();
  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

// ============================================================
// Types
// ============================================================

export interface FinancialSummary {
  income_paisa: number;
  expense_paisa: number;
  net_paisa: number;
  txn_count: number;
}

export interface MonthlyFinancial {
  month: string;
  income_paisa: number;
  expense_paisa: number;
  net_paisa: number;
}

export interface ZakatSummary {
  received_paisa: number;
  distributed_paisa: number;
  balance_paisa: number;
  total_beneficiaries: number;
}

export interface ZakatCategoryRow {
  category: string;
  amount_paisa: number;
  beneficiaries: number;
}

export interface TransparencyFactor {
  factor: string;
  label_bn: string;
  points: number;
  max_points: number;
  earned: boolean;
}

export interface PrayerTimes {
  fajr: string | null; sunrise: string | null; dhuhr: string | null;
  asr: string | null; maghrib: string | null; isha: string | null;
  jumuah: string | null; jumuah_khutbah: string | null;
  taraweeh: string | null; sehri_end: string | null; iftar: string | null;
  eid_jamaat_1: string | null; eid_jamaat_2: string | null; eid_note_bn: string | null;
  note_bn: string | null;
  kind: 'daily' | 'ramadan' | 'eid';
  updated_at: string;
}

export interface StaffMember {
  id: string; name_bn: string; name_en: string | null;
  position: string; position_label_bn: string | null;
  qualifications_bn: string | null; languages: string[] | null;
  serving_since: string | null; photo_path: string | null; bio_bn: string | null;
  public_phone: string | null; public_email: string | null;
}

export interface CommitteeMember {
  id: string; name_bn: string; name_en: string | null;
  role_label_bn: string; photo_path: string | null;
  term_start: string | null; term_end: string | null; formation_date: string | null;
}

export interface CommunityService {
  id: string; title_bn: string; title_en: string | null;
  description_bn: string | null; icon: string | null; contact_note_bn: string | null;
}

export interface CampaignSummary {
  id: string; slug: string; title_bn: string; description_bn: string | null;
  status: string; cover_image_path: string | null; end_date: string | null;
  target_paisa: number; received_paisa: number; remaining_paisa: number; progress_percent: number;
}

export interface ProjectSummary {
  id: string; slug: string; title_bn: string; description_bn: string | null;
  status: string; progress_percent: number;
  start_date: string | null; expected_completion: string | null;
  budget_paisa: number; spent_paisa: number; remaining_paisa: number;
}

export interface PublicDocument {
  id: string; title_bn: string; doc_type: string;
  description_bn: string | null; file_path: string;
  period_start: string | null; period_end: string | null; created_at: string;
}

// ============================================================
// Reads
// ============================================================

export async function getPrayerTimes(masjidId: string): Promise<PrayerTimes[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('prayer_times')
    .select('*')
    .eq('masjid_id', masjidId);
  if (error) {
    console.error('Prayer times query failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as PrayerTimes[];
}

export async function getMosqueStaff(masjidId: string): Promise<StaffMember[]> {
  const supabase = createStaticSupabaseClient();
  // Reads the view, not the table — private contact columns are filtered there.
  const { data, error } = await supabase
    .from('public_mosque_staff')
    .select('*')
    .eq('masjid_id', masjidId)
    .order('sort_order');
  if (error) {
    console.error('Staff query failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as StaffMember[];
}

export async function getCommittee(masjidId: string): Promise<CommitteeMember[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_committee_members')
    .select('id, name_bn, name_en, role_label_bn, photo_path, term_start, term_end, formation_date')
    .eq('masjid_id', masjidId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    console.error('Committee query failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as CommitteeMember[];
}

export async function getCommunityServices(masjidId: string): Promise<CommunityService[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('community_services')
    .select('id, title_bn, title_en, description_bn, icon, contact_note_bn')
    .eq('masjid_id', masjidId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    console.error('Services query failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as CommunityService[];
}

export async function getFinancialSummary(
  masjidId: string,
  from?: string,
  to?: string
): Promise<FinancialSummary | null> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase.rpc('mosque_financial_summary', {
    p_masjid_id: masjidId,
    p_from: from ?? null,
    p_to: to ?? null,
  });
  if (error) {
    console.error('Financial summary failed:', error.message);
    return null;
  }
  return (data?.[0] as FinancialSummary) ?? null;
}

export async function getMonthlyFinancials(
  masjidId: string,
  months = 12
): Promise<MonthlyFinancial[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase.rpc('mosque_monthly_financials', {
    p_masjid_id: masjidId,
    p_months: months,
  });
  if (error) {
    console.error('Monthly financials failed:', error.message);
    return [];
  }
  return (data ?? []) as MonthlyFinancial[];
}

export async function getZakatSummary(masjidId: string): Promise<ZakatSummary | null> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase.rpc('mosque_zakat_summary', { p_masjid_id: masjidId });
  if (error) {
    console.error('Zakat summary failed:', error.message);
    return null;
  }
  return (data?.[0] as ZakatSummary) ?? null;
}

export async function getZakatByCategory(masjidId: string): Promise<ZakatCategoryRow[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase.rpc('mosque_zakat_by_category', { p_masjid_id: masjidId });
  if (error) {
    console.error('Zakat breakdown failed:', error.message);
    return [];
  }
  return (data ?? []) as ZakatCategoryRow[];
}

export async function getTransparencyScore(
  masjidId: string
): Promise<{ total: number; factors: TransparencyFactor[] }> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase.rpc('mosque_transparency_score', { p_masjid_id: masjidId });
  if (error) {
    console.error('Transparency score failed:', error.message);
    return { total: 0, factors: [] };
  }
  const factors = (data ?? []) as TransparencyFactor[];
  return {
    total: factors.reduce((sum, f) => sum + Number(f.points), 0),
    factors,
  };
}

export async function getCampaigns(masjidId: string): Promise<CampaignSummary[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('donation_campaigns')
    .select('id, slug, title_bn, description_bn, status, cover_image_path, end_date, target_paisa')
    .eq('masjid_id', masjidId)
    .in('status', ['active', 'paused', 'completed'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Campaign query failed:', error.message);
    return [];
  }

  // Totals come from campaign_totals() so the received figure is always derived.
  const rows = data ?? [];
  const totals = await Promise.all(
    rows.map((c: Record<string, unknown>) => supabase.rpc('campaign_totals', { p_campaign_id: c.id as string }))
  );

  return rows.map((c: Record<string, unknown>, i: number) => {
    const t = (totals[i].data as Record<string, unknown>[])?.[0] ?? {} as Record<string, unknown>;
    return {
      ...c,
      target_paisa: Number(c.target_paisa),
      received_paisa: Number(t.received_paisa ?? 0),
      remaining_paisa: Number(t.remaining_paisa ?? c.target_paisa),
      progress_percent: Number(t.progress_percent ?? 0),
    } as CampaignSummary;
  });
}

export async function getProjects(masjidId: string): Promise<ProjectSummary[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_projects')
    .select('id, slug, title_bn, description_bn, status, progress_percent, start_date, expected_completion')
    .eq('masjid_id', masjidId)
    .eq('is_published', true)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Project query failed:', error.message);
    return [];
  }

  const rows = data ?? [];
  const totals = await Promise.all(
    rows.map((p: Record<string, unknown>) => supabase.rpc('project_totals', { p_project_id: p.id as string }))
  );

  return rows.map((p: Record<string, unknown>, i: number) => {
    const t = (totals[i].data as Record<string, unknown>[])?.[0] ?? {} as Record<string, unknown>;
    return {
      ...p,
      budget_paisa: Number(t.budget_paisa ?? 0),
      spent_paisa: Number(t.spent_paisa ?? 0),
      remaining_paisa: Number(t.remaining_paisa ?? 0),
    } as ProjectSummary;
  });
}

export async function getPublicDocuments(masjidId: string): Promise<PublicDocument[]> {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('mosque_documents')
    .select('id, title_bn, doc_type, description_bn, file_path, period_start, period_end, created_at')
    .eq('masjid_id', masjidId)
    .eq('is_public', true)
    .eq('verification_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('Documents query failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as PublicDocument[];
}

/** Public change history — reuses the existing masjid_change_history table. */
export async function getPublicChangeHistory(masjidId: string, limit = 15) {
  const supabase = createStaticSupabaseClient();
  const { data, error } = await supabase
    .from('masjid_change_history')
    .select('id, action, field_name, created_at')
    .eq('masjid_id', masjidId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Change history failed:', error.message);
    return [];
  }
  return data ?? [];
}
