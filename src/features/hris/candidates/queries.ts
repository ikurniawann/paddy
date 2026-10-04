"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { candidatesQueryKeys } from "./query-keys";
import {
  fetchCandidateList,
  fetchCandidateBrands,
  fetchCandidateDetail,
  fetchCandidateAnalytics,
  fetchAnalyticsBrands,
} from "./api";
import type { CandidateListParams } from "./types";

export const useCandidateList = (params: CandidateListParams) =>
  useQuery({
    queryKey: candidatesQueryKeys.list(params),
    queryFn: () => fetchCandidateList(params),
    placeholderData: keepPreviousData,
  });

export const useCandidateBrands = () =>
  useQuery({
    queryKey: candidatesQueryKeys.brands(),
    queryFn: fetchCandidateBrands,
  });

export const useCandidateDetail = (id: string) =>
  useQuery({
    queryKey: candidatesQueryKeys.detail(id),
    queryFn: () => fetchCandidateDetail(id),
    enabled: !!id,
  });

export const useCandidateAnalytics = (brandFilter: string) =>
  useQuery({
    queryKey: candidatesQueryKeys.analytics(brandFilter),
    queryFn: () => fetchCandidateAnalytics(brandFilter),
  });

export const useAnalyticsBrands = () =>
  useQuery({
    queryKey: candidatesQueryKeys.analyticsBrands(),
    queryFn: fetchAnalyticsBrands,
  });
