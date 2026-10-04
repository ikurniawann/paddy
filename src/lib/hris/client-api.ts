// ============================================================
// HRIS Helper Functions
// Utility functions untuk HRIS module
// ============================================================

import { Employee, Department, PaginatedResponse, EmployeeListFilters } from '@/types/hris';

// ============================================================
// EMPLOYEES
// ============================================================

/**
 * Get list employees dengan filter & pagination
 */
export async function getEmployees(filters?: EmployeeListFilters): Promise<PaginatedResponse<Employee>> {
  const params = new URLSearchParams();
  
  if (filters?.search) params.set('search', filters.search);
  if (filters?.department_id) params.set('department_id', filters.department_id);
  if (filters?.section_id) params.set('section_id', filters.section_id);
  if (filters?.employment_status) params.set('employment_status', filters.employment_status);
  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.sort_by) params.set('sort_by', filters.sort_by);
  if (filters?.sort_order) params.set('sort_order', filters.sort_order);

  const response = await fetch(`/api/hris/employees?${params}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Gagal mengambil data karyawan');
  }

  return result;
}

/**
 * Get employee by ID
 */
export async function getEmployee(id: string): Promise<Employee> {
  const response = await fetch(`/api/hris/employees/${id}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Gagal mengambil data karyawan');
  }

  return result.data;
}

/**
 * Create new employee
 */
export async function createEmployee(data: Partial<Employee>): Promise<Employee> {
  const response = await fetch('/api/hris/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Gagal membuat data karyawan');
  }

  return result.data;
}

/**
 * Update employee
 */
export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
  const response = await fetch(`/api/hris/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Gagal update data karyawan');
  }

  return result.data;
}

/**
 * Soft delete employee (set is_active = false)
 */
export async function deleteEmployee(id: string): Promise<void> {
  const response = await fetch(`/api/hris/employees/${id}`, {
    method: 'DELETE',
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Gagal menghapus data karyawan');
  }
}

/**
 * Promote candidate to employee
 */
export async function promoteCandidate(
  candidateId: string,
  options?: {
    joinDate?: string;
    employmentStatus?: string;
    departmentId?: string;
    reportingTo?: string;
  }
): Promise<{ employee: Employee; nip: string }> {
  const response = await fetch('/api/hris/promote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate_id: candidateId,
      join_date: options?.joinDate,
      employment_status: options?.employmentStatus,
      department_id: options?.departmentId,
      reporting_to: options?.reportingTo,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Gagal mempromosikan kandidat');
  }

  return {
    employee: result.data,
    nip: result.nip,
  };
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Format NIP display
 */
export function formatNIP(nip: string): string {
  return nip; // Already formatted: EMP-YYYY-XXXXX
}

/**
 * Calculate tenure (masa kerja)
 */
export function calculateTenure(joinDate: string): string {
  const join = new Date(joinDate);
  const now = new Date();
  const years = now.getFullYear() - join.getFullYear();
  const months = now.getMonth() - join.getMonth();
  
  if (years > 0) {
    return `${years} tahun ${Math.max(0, months)} bulan`;
  } else if (months > 0) {
    return `${months} bulan`;
  } else {
    return 'Baru bergabung';
  }
}

/**
 * Get employment status label (Bahasa Indonesia)
 */
export function getEmploymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    probation: 'Probation',
    contract: 'Kontrak',
    permanent: 'Tetap',
    internship: 'Magang',
    resigned: 'Mengundurkan Diri',
    terminated: 'Diberhentikan',
    suspended: 'Diskorsing',
  };
  return labels[status] || status;
}

/**
 * Get employment status color (Tailwind class)
 */
export function getEmploymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    probation: 'bg-yellow-500',
    contract: 'bg-blue-500',
    permanent: 'bg-green-500',
    internship: 'bg-purple-500',
    resigned: 'bg-gray-500',
    terminated: 'bg-red-500',
    suspended: 'bg-orange-500',
  };
  return colors[status] || 'bg-gray-500';
}
