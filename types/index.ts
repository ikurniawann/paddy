// ============================================================
// Aapex Technology - Talent Pool & Recruitment System
// TypeScript Types
// ============================================================

// ============================================================
// ENUMS
// ============================================================
export type UserRole = "hrd" | "hiring_manager" | "direksi" | "purchasing_admin" | "purchasing_manager" | "purchasing_staff" | "finance_staff" | "warehouse_staff" | "warehouse_admin" | "pos" | "admin" | "qc_staff";
export type CandidateSource =
  | "portal"
  | "internal"
  | "referral"
  | "jobstreet"
  | "instagram"
  | "jobfair"
  | "other";
export type CandidateStatus =
  | "new"
  | "screening"
  | "interview_hrd"
  | "interview_manager"
  | "talent_pool"
  | "hired"
  | "rejected";
export type InterviewType = "hrd" | "hiring_manager";
export type InterviewRecommendation = "proceed" | "pool" | "reject";
export type NotificationChannel = "whatsapp" | "email";
export type NotificationStatus = "pending" | "sent" | "failed";

// ============================================================
// DATABASE TABLES
// ============================================================
export interface Brand {
  id: string;
  name: string;
  industry: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  full_name: string;
  role: UserRole;
  brand_id: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  brand_id: string | null;
  title: string;
  department: string | null;
  level: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  domicile: string | null;
  source: CandidateSource;
  position_id: string | null;
  brand_id: string | null;
  cv_url: string | null;
  photo_url: string | null;
  status: CandidateStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  promoted_to_employee_id: string | null;
  // Joined fields
  position?: Position;
  brand?: Brand;
  interviews?: Interview[];
}

export interface Interview {
  id: string;
  candidate_id: string;
  interviewer_id: string | null;
  interview_date: string | null;
  type: InterviewType;
  scorecard: Scorecard;
  recommendation: InterviewRecommendation | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  candidate?: Candidate;
  interviewer?: User;
}

export interface NotificationLog {
  id: string;
  candidate_id: string | null;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  sent_at: string;
  // Joined fields
  candidate?: Candidate;
}

// ============================================================
// SCORECARD
// ============================================================
export interface Scorecard {
  [key: string]: number | string | boolean;
}

// ============================================================
// PIPELINE STATUS CONFIG
// ============================================================
export interface PipelineStatus {
  id: CandidateStatus;
  label: string;
  color: string;
}

export const PIPELINE_STATUSES: PipelineStatus[] = [
  { id: "new", label: "Baru", color: "bg-slate-500" },
  { id: "screening", label: "Screening", color: "bg-blue-500" },
  { id: "interview_hrd", label: "Interview HRD", color: "bg-yellow-500" },
  { id: "interview_manager", label: "Interview Manager", color: "bg-orange-500" },
  { id: "talent_pool", label: "Talent Pool", color: "bg-purple-500" },
  { id: "hired", label: "Diterima", color: "bg-green-500" },
  { id: "rejected", label: "Ditolak", color: "bg-red-500" },
];

// ============================================================
// API RESPONSE TYPES
// ============================================================
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// ============================================================
// FORM TYPES
// ============================================================
export interface CandidateFormData {
  full_name: string;
  email?: string;
  phone: string;
  domicile?: string;
  source: CandidateSource;
  position_id?: string;
  brand_id?: string;
  notes?: string;
}

export interface InterviewFormData {
  candidate_id: string;
  interviewer_id?: string;
  interview_date: string;
  type: InterviewType;
  scorecard: Scorecard;
  recommendation?: InterviewRecommendation;
  notes?: string;
}

// ============================================================
// SESSION / AUTH TYPES
// ============================================================
export interface Session {
  user: User;
  brand?: Brand;
}

// ============================================================
// HRIS MODULE (Fase 0)
// ============================================================
// Re-export semua types dari hris.ts
export * from './hris';
