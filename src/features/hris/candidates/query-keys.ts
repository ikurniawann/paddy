import type { CandidateListParams } from "./types";

export const candidatesQueryKeys = {
  all: ["hris", "candidates"] as const,
  list: (params: CandidateListParams) =>
    ["hris", "candidates", "list", params] as const,
  brands: () => ["hris", "candidates", "brands"] as const,
  detail: (id: string) => ["hris", "candidates", "detail", id] as const,
  analytics: (brandFilter: string) =>
    ["hris", "candidates", "analytics", brandFilter] as const,
  analyticsBrands: () => ["hris", "candidates", "analytics-brands"] as const,
};
