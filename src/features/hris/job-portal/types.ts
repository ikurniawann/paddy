export type JobStatus = "draft" | "published" | "closed";

export interface JobBrandOption {
  id: string;
  name: string;
}

export interface JobPositionOption {
  id: string;
  title: string;
  department: string | null;
  level: string | null;
}

export interface JobDepartmentOption {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface JobOpening {
  id: string;
  position_id: string | null;
  brand_id: string | null;
  department_id: string | null;
  title: string;
  slug: string;
  department: string;
  location: string;
  employment_type: string;
  work_mode: string;
  headcount: number;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  status: JobStatus;
  closing_date: string | null;
  created_at: string;
  updated_at: string;
  brand?: JobBrandOption | null;
  position?: JobPositionOption | null;
  department_ref?: JobDepartmentOption | null;
}

export interface JobOpeningPayload {
  position_id: string | null;
  brand_id: string | null;
  department_id: string | null;
  title: string;
  slug: string;
  department: string;
  location: string;
  employment_type: string;
  work_mode: string;
  headcount: number;
  description: string;
  requirements: string;
  benefits: string;
  status: JobStatus;
  closing_date: string | null;
}
