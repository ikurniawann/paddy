export interface DashboardBrand {
  id: string;
  name: string;
}

export interface DashboardSummary {
  thisMonth: number;
  activePipeline: number;
  talentPool: number;
  openPositions: number;
}

export interface WeeklyPoint {
  week: string;
  candidates: number;
}

export interface SourceDatum {
  name: string;
  value: number;
}

export interface FunnelDatum {
  name: string;
  value: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AttentionItem = any;

export interface DashboardData {
  summary: DashboardSummary;
  weeklyApps: WeeklyPoint[];
  sourceDist: SourceDatum[];
  pipelineFunnel: FunnelDatum[];
  needsAttention: AttentionItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DashboardCandidate = any;
