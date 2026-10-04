import { apiGet } from "@/lib/api-client";
import type { HRISReportData } from "./types";

export const fetchHRISReport = (month: number, year: number) =>
  apiGet<HRISReportData>(`/api/hris/reports?month=${month}&year=${year}`);
