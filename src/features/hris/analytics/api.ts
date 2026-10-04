import type { AnalyticsBrand, AnalyticsData } from "./types";

export async function fetchAnalyticsBrands(): Promise<AnalyticsBrand[]> {
  const res = await fetch("/api/brands");
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
}

export async function fetchAnalyticsData(
  brandFilter: string,
  period: string
): Promise<AnalyticsData> {
  const brandParam = brandFilter !== "all" ? `&brand_id=${brandFilter}` : "";

  const [overviewRes, sourcesRes, brandsRes] = await Promise.all([
    fetch(`/api/analytics/overview?period=${period}${brandParam}`),
    fetch(`/api/analytics/sources?period=${period}${brandParam}`),
    fetch(`/api/analytics/brands?period=${period}${brandParam}`),
  ]);

  const overviewData = await overviewRes.json().catch(() => ({}));
  const sourcesData = await sourcesRes.json().catch(() => ({}));
  const brandsData = await brandsRes.json().catch(() => ({}));

  const stageLabels: Record<string, string> = {
    Applied: "Applied",
    Screening: "Screening",
    "Interview HRD": "Interview HRD",
    "Interview Manager": "Interview Manager",
    "Talent Pool": "Talent Pool",
    Hired: "Hired",
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversionRates = (overviewData.conversion_rates || []).map((c: any) => ({
    stage: stageLabels[c.stage] || c.stage,
    rate: c.rate,
    from: 0,
    to: 0,
  }));

  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date();
    mStart.setMonth(mStart.getMonth() - i);
    mStart.setDate(1);
    const label = mStart.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    monthlyTrend.push({
      month: label,
      applied: Math.round((overviewData.total_applicants || 0) / 6),
      hired: Math.round((overviewData.total_hired || 0) / 6),
    });
  }

  return {
    timeToHire: {
      avgDays: overviewData.time_to_hire_avg ?? 0,
      count: overviewData.total_hired ?? 0,
    },
    conversionRates,
    topSources: Array.isArray(sourcesData.data) ? sourcesData.data : [],
    hardToFill: Array.isArray(overviewData.hard_to_fill) ? overviewData.hard_to_fill : [],
    brandComparison: Array.isArray(brandsData.barData) ? brandsData.barData : [],
    monthlyTrend,
    hiredByBrand: Array.isArray(brandsData.pieData) ? brandsData.pieData : [],
  };
}
