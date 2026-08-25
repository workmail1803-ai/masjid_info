// ============================================================
// TypeScript types matching the database schema
// ============================================================

// Enums
export type StructureType = 'small' | 'medium' | 'large' | 'multi_storey' | 'tin_shed' | 'semi_permanent' | 'under_construction' | 'unknown';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'needs_review' | 'rejected' | 'archived';
export type PublishStatus = 'draft' | 'published' | 'archived';
export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';
export type ImageSourceType = 'admin_upload' | 'representative_upload' | 'user_submission' | 'licensed_third_party' | 'open_license' | 'external_reference';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type SubmissionStatus = 'pending_review' | 'approved' | 'rejected' | 'merged';
export type CorrectionIssueType = 'wrong_name' | 'wrong_address' | 'wrong_location' | 'wrong_image' | 'wrong_phone' | 'duplicate' | 'mosque_closed' | 'other';
export type ChangeAction = 'create' | 'update' | 'delete' | 'verify' | 'merge' | 'import' | 'reject';
export type AuditAction = 'create' | 'update' | 'delete' | 'verify' | 'merge' | 'import' | 'reject' | 'approve' | 'login' | 'settings_change';
export type ImportStatus = 'uploading' | 'parsing' | 'validating' | 'previewing' | 'importing' | 'completed' | 'failed' | 'cancelled';
export type CategoryType = 'news' | 'topic' | 'resource' | 'activity';

// Geography
export interface Division {
  id: number;
  name_bn: string;
  name_en: string;
  slug: string;
  code: string;
  sort_order: number;
}

export interface District {
  id: number;
  division_id: number;
  name_bn: string;
  name_en: string;
  slug: string;
  code: string;
  sort_order: number;
}

export interface Upazila {
  id: number;
  district_id: number;
  name_bn: string;
  name_en: string;
  slug: string;
  code: string | null;
  sort_order: number;
}

// Masjid
export interface Masjid {
  id: string;
  central_code: string;
  district_code: string;
  slug: string;
  name_bn: string;
  name_en: string | null;
  division_id: number;
  district_id: number;
  upazila_id: number | null;
  area_name_bn: string | null;
  area_name_en: string | null;
  address_bn: string | null;
  address_en: string | null;
  latitude: number | null;
  longitude: number | null;
  structure_type: StructureType;
  description_bn: string | null;
  description_en: string | null;
  established_year: number | null;
  contact_number: string | null;
  email: string | null;

  // Facilities & official contact — added in migration 00012.
  capacity: number | null;
  floors: number | null;
  has_women_prayer_area: boolean;
  has_wudu_facility: boolean;
  has_toilet: boolean;
  has_parking: boolean;
  is_wheelchair_accessible: boolean;
  has_ac: boolean;
  has_library: boolean;
  official_phone: string | null;
  official_email: string | null;
  history_bn: string | null;
  history_en: string | null;

  rating_average: number;
  rating_count: number;
  has_image: boolean;
  has_contact: boolean;
  verification_status: VerificationStatus;
  status: PublishStatus;
  source_type: string | null;
  source_name: string | null;
  source_url: string | null;
  source_record_id: string | null;
  collected_at: string | null;
  verified_at: string | null;
  search_text: string;
  created_at: string;
  updated_at: string;
}

// Masjid with joined geography (for display)
export interface MasjidWithGeo extends Masjid {
  division?: Division;
  district?: District;
  upazila?: Upazila;
}

// Search result (lightweight, from RPC)
export interface MasjidSearchResult {
  id: string;
  central_code: string;
  slug: string;
  name_bn: string;
  name_en: string | null;
  area_name_bn: string | null;
  district_name_bn: string;
  district_name_en: string;
  upazila_name_bn: string | null;
  upazila_name_en: string | null;
  structure_type: StructureType;
  verification_status: VerificationStatus;
  rating_average: number;
  rating_count: number;
  has_image: boolean;
  thumbnail_path: string | null;
  latitude: number | null;
  longitude: number | null;
  total_count: number;
}

// Map point (minimal for clustering)
export interface MasjidMapPoint {
  id: string;
  name_bn: string;
  slug: string;
  latitude: number;
  longitude: number;
  verification_status: VerificationStatus;
}

// Images
export interface MasjidImage {
  id: string;
  masjid_id: string;
  source_type: ImageSourceType;
  source_url: string | null;
  license: string | null;
  attribution_text: string | null;
  attribution_required: boolean;
  external_only: boolean;
  local_storage_allowed: boolean;
  storage_path: string | null;
  thumbnail_path: string | null;
  card_path: string | null;
  detail_path: string | null;
  hero_path: string | null;
  status: ModerationStatus;
  sort_order: number;
  is_primary: boolean;
}

// Rating
export interface MasjidRating {
  id: string;
  masjid_id: string;
  user_id: string | null;
  overall: number;
  cleanliness: number | null;
  facilities: number | null;
  accessibility: number | null;
  comment: string | null;
  status: ModerationStatus;
  created_at: string;
}

// Submission
export interface MasjidSubmission {
  image_paths: string[] | null;
  id: string;
  name_bn: string;
  name_en: string | null;
  division_id: number | null;
  district_id: number | null;
  upazila_id: number | null;
  area_name_bn: string | null;
  address_bn: string | null;
  latitude: number | null;
  longitude: number | null;
  structure_type: StructureType;
  established_year: number | null;
  description_bn: string | null;
  contact_number: string | null;
  email: string | null;
  submitter_name: string | null;
  submitter_contact: string | null;
  source_info: string | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  merged_with_masjid_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Correction Request
export interface CorrectionRequest {
  id: string;
  masjid_id: string;
  issue_type: CorrectionIssueType;
  description: string | null;
  submitter_name: string | null;
  submitter_contact: string | null;
  status: ModerationStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// Content
export interface Category {
  id: number;
  name_bn: string;
  name_en: string;
  slug: string;
  type: CategoryType;
  sort_order: number;
}

export interface Notice {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  body_bn: string | null;
  body_en: string | null;
  image_path: string | null;
  attachment_path: string | null;
  is_featured: boolean;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
}

export interface NewsPost {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  excerpt_bn: string | null;
  excerpt_en: string | null;
  content_bn: string | null;
  content_en: string | null;
  cover_image_path: string | null;
  author_name: string | null;
  category_id: number | null;
  related_masjid_id: string | null;
  related_district_id: number | null;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
}

export interface IslamicTopic {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  content_bn: string | null;
  content_en: string | null;
  cover_image_path: string | null;
  category_id: number | null;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  description_bn: string | null;
  description_en: string | null;
  image_path: string | null;
  file_path: string | null;
  file_type: string | null;
  category_id: number | null;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  description_bn: string | null;
  description_en: string | null;
  masjid_id: string | null;
  event_date: string | null;
  location_bn: string | null;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
}

// Profile
export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Audit Log
export interface AuditLog {
  id: number;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Import Batch
export interface ImportBatch {
  id: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  inserted_rows: number;
  updated_rows: number;
  failed_rows: number;
  status: ImportStatus;
  error_report_path: string | null;
  imported_by: string | null;
  created_at: string;
  completed_at: string | null;
}

// Directory Stats
export interface DirectoryStats {
  total_masjids: number;
  verified_masjids: number;
  districts_covered: number;
  upazilas_covered: number;
  recently_added: number;
  pending_submissions: number;
}

// Duplicate candidate (from RPC)
export interface DuplicateCandidate {
  id: string;
  central_code: string;
  name_bn: string;
  name_en: string | null;
  district_name_en: string | null;
  similarity_score: number;
  distance_meters: number | null;
}

// Search/filter params
export interface DirectoryFilters {
  q?: string;
  division_id?: number;
  district_id?: number;
  upazila_id?: number;
  structure_type?: StructureType;
  verification?: VerificationStatus;
  has_image?: boolean;
  has_contact?: boolean;
  page?: number;
  limit?: number;
}

// Structure type labels
export const structureTypeLabels: Record<StructureType, { bn: string; en: string }> = {
  small: { bn: 'ছোট', en: 'Small' },
  medium: { bn: 'মাঝারি', en: 'Medium' },
  large: { bn: 'বড়', en: 'Large' },
  multi_storey: { bn: 'বহুতল', en: 'Multi-storey' },
  tin_shed: { bn: 'টিনের', en: 'Tin Shed' },
  semi_permanent: { bn: 'আধা-পাকা', en: 'Semi-permanent' },
  under_construction: { bn: 'নির্মাণাধীন', en: 'Under Construction' },
  unknown: { bn: 'অজানা', en: 'Unknown' },
};

export const verificationLabels: Record<VerificationStatus, { bn: string; en: string }> = {
  unverified: { bn: 'যাচাই হয়নি', en: 'Unverified' },
  pending: { bn: 'যাচাই অপেক্ষমান', en: 'Pending' },
  verified: { bn: 'যাচাইকৃত', en: 'Verified' },
  needs_review: { bn: 'পর্যালোচনা প্রয়োজন', en: 'Needs Review' },
  rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected' },
  archived: { bn: 'আর্কাইভ', en: 'Archived' },
};
