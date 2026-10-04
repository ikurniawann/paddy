export interface PayrollRun {
  id: string;
  run_name: string;
  period_month: number;
  period_year: number;
  status: string;
  total_employees: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  created_at: string;
  processed_at?: string;
  approved_at?: string;
  paid_at?: string;
}

export interface CreatePayrollPayload {
  period_month: number;
  period_year: number;
}

export interface CalculatePayrollResult {
  summary?: {
    total_employees?: number;
    employee_names?: string[];
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PayrollRunDetail = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PayslipDetail = any;
