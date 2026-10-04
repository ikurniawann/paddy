import { createBrowserClient } from "@/lib/pg/browser-client";
import type {
  DashboardBrand,
  DashboardData,
  DashboardCandidate,
} from "./types";

export async function fetchDashboardBrands(): Promise<DashboardBrand[]> {
  const db = createBrowserClient();
  const { data } = await db
    .from("brands")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return (data as DashboardBrand[]) || [];
}

export async function fetchDashboardData(
  brandFilter: string,
  period: string
): Promise<DashboardData> {
  const brandParam = brandFilter !== "all" ? `&brand_id=${brandFilter}` : "";

  const [statsRes, weeklyRes, sourcesRes, funnelRes, attentionRes] = await Promise.all([
    fetch(`/api/dashboard/stats?${brandParam.slice(1)}`),
    fetch(`/api/dashboard/weekly?period=${period}${brandParam}`),
    fetch(`/api/dashboard/sources?${brandParam.slice(1)}`),
    fetch(`/api/dashboard/funnel?${brandParam.slice(1)}`),
    fetch(`/api/dashboard/attention?${brandParam.slice(1)}`),
  ]);

  const statsData = await statsRes.json().catch(() => ({}));
  const weeklyData = await weeklyRes.json().catch(() => []);
  const sourcesData = await sourcesRes.json().catch(() => []);
  const funnelData = await funnelRes.json().catch(() => []);
  const attentionData = await attentionRes.json().catch(() => ({}));

  return {
    summary: {
      thisMonth: statsData.candidates_this_month || 0,
      activePipeline: statsData.active_pipeline || 0,
      talentPool: statsData.talent_pool || 0,
      openPositions: statsData.open_positions || 0,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weeklyApps: (Array.isArray(weeklyData) ? weeklyData : []).map((w: any) => ({
      week: w.label || w.week,
      candidates: w.count,
    })),
    sourceDist: Array.isArray(sourcesData) ? sourcesData : [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipelineFunnel: (Array.isArray(funnelData) ? funnelData : []).map((f: any) => ({
      name: f.stage,
      value: f.count,
    })),
    needsAttention: attentionData.data || [],
  };
}

export async function fetchDashboardCandidatesForExport(
  brandFilter: string
): Promise<DashboardCandidate[]> {
  const brandParam = brandFilter !== "all" ? `brand_id=${brandFilter}` : "";
  const res = await fetch(`/api/candidates?${brandParam}&limit=1000`);
  const data = await res.json().catch(() => ({}));
  return data.data || [];
}
