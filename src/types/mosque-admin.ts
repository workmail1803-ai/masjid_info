/**
 * Types for the mosque management system (migration 00011+).
 *
 * Kept separate from `database.ts` so the existing directory types stay
 * untouched, but the naming conventions follow that file exactly:
 * snake_case columns, `_bn`/`_en` pairs, and Bangla display labels.
 */

// ============================================================
// Roles & capabilities (migration 00011)
// ============================================================

export type MosqueRole =
  | 'owner'
  | 'chairman'
  | 'secretary'
  | 'treasurer'
  | 'imam'
  | 'muazzin'
  | 'editor'
  | 'viewer';

export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'revoked';

export type ClaimStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

/**
 * Capability strings accepted by the `mosque_can()` SQL function.
 * Keep this union in sync with the CASE arms in migration 00011.
 */
export type MosqueCapability =
  | 'manage_profile'
  | 'manage_committee'
  | 'manage_staff'
  | 'manage_prayer_times'
  | 'manage_events'
  | 'manage_announcements'
  | 'manage_services'
  | 'manage_finance'
  | 'publish_finance'
  | 'manage_zakat'
  | 'manage_campaigns'
  | 'manage_projects'
  | 'manage_documents'
  | 'manage_members'
  | 'view_dashboard';

export interface MosqueMembershipRow {
  id: string;
  masjid_id: string;
  user_id: string;
  role: MosqueRole;
  status: MembershipStatus;
  granted_by: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MosqueAdminClaim {
  id: string;
  masjid_id: string;
  user_id: string;
  requested_role: MosqueRole;
  full_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  position_description: string | null;
  evidence_note: string | null;
  evidence_document_path: string | null;
  status: ClaimStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Display labels (Bangla-first, matching the existing UI)
// ============================================================

export const mosqueRoleLabels: Record<MosqueRole, string> = {
  owner: 'দায়িত্বপ্রাপ্ত',
  chairman: 'সভাপতি',
  secretary: 'সাধারণ সম্পাদক',
  treasurer: 'কোষাধ্যক্ষ',
  imam: 'ইমাম',
  muazzin: 'মুয়াজ্জিন',
  editor: 'সম্পাদক',
  viewer: 'পর্যবেক্ষক',
};

export const mosqueRoleLabelsEn: Record<MosqueRole, string> = {
  owner: 'Owner',
  chairman: 'Chairman',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  imam: 'Imam',
  muazzin: 'Muazzin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const membershipStatusLabels: Record<MembershipStatus, string> = {
  pending: 'অপেক্ষমাণ',
  active: 'সক্রিয়',
  suspended: 'স্থগিত',
  revoked: 'বাতিল',
};

export const claimStatusLabels: Record<ClaimStatus, string> = {
  pending: 'অপেক্ষমাণ',
  under_review: 'পর্যালোচনাধীন',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
  withdrawn: 'প্রত্যাহৃত',
};

/**
 * Roles a person may request when claiming a mosque.
 * `owner` is excluded: it is granted by a platform admin, not requested.
 */
export const CLAIMABLE_ROLES: MosqueRole[] = [
  'chairman',
  'secretary',
  'treasurer',
  'imam',
  'muazzin',
  'editor',
];
