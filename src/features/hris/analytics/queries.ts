"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { analyticsQueryKeys } from "./query-keys";
import { fetchAnalyticsBrands, fetchAnalyticsData } from "./api";

export const useAnalyticsBrands = () =>
  useQuery({
    queryKey: analyticsQueryKeys.brands(),
    queryFn: fetchAnalyticsBrands,
  });

export const useAnalyticsData = (brandFilter: string, period: string) =>
  useQuery({
    queryKey: analyticsQueryKeys.data(brandFilter, period),
    queryFn: () => fetchAnalyticsData(brandFilter, period),
    placeholderData: keepPreviousData,
  });
