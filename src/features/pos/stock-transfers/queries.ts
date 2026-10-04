"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchStockTransfer, fetchStockTransfers } from "./api";
import { stockTransfersQueryKeys } from "./query-keys";
import type { StockTransferFilter } from "./types";

export function useStockTransfers(filter: StockTransferFilter) {
  return useQuery({
    queryKey: stockTransfersQueryKeys.list(filter),
    queryFn: () => fetchStockTransfers(filter),
    placeholderData: keepPreviousData,
  });
}

export function useStockTransfer(id: string | null) {
  return useQuery({
    queryKey: stockTransfersQueryKeys.detail(id ?? ""),
    queryFn: () => fetchStockTransfer(id as string),
    enabled: Boolean(id),
  });
}
