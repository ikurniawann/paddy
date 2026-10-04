"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBusinessTree } from "./api";
import { businessQueryKeys } from "./query-keys";

export const useBusinessTree = (enabled = true) =>
  useQuery({
    queryKey: businessQueryKeys.tree(),
    queryFn: fetchBusinessTree,
    enabled,
    retry: 1,
    staleTime: 60_000,
  });
