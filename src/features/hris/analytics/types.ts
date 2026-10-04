export interface AnalyticsBrand {
  id: string;
  name: string;
}

export interface TimeToHire {
  avgDays: number;
  count: number;
}

export interface ConversionRate {
  stage: string;
  rate: number;
  from: number;
  to: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnalyticsSource = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HardToFillItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BrandComparison = any;

export interface MonthlyTrendPoint {
  month: string;
  applied: number;
  hired: number;
}

export interface HiredByBrand {
  name: string;
  value: number;
}

export interface AnalyticsData {
  timeToHire: TimeToHire;
  conversionRates: ConversionRate[];
  topSources: AnalyticsSource[];
  hardToFill: HardToFillItem[];
  brandComparison: BrandComparison[];
  monthlyTrend: MonthlyTrendPoint[];
  hiredByBrand: HiredByBrand[];
}
