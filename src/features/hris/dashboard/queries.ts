"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { dashboardQueryKeys } from "./query-keys";
import { fetchDashboardBrands, fetchDashboardData } from "./api";

export const useDashboardBrands = () =>
  useQuery({
    queryKey: dashboardQueryKeys.brands(),
    queryFn: fetchDashboardBrands,
  });

export const useDashboardData = (brandFilter: string, period: string) =>
  useQuery({
    queryKey: dashboardQueryKeys.data(brandFilter, period),
    queryFn: () => fetchDashboardData(brandFilter, period),
    placeholderData: keepPreviousData,
  });
