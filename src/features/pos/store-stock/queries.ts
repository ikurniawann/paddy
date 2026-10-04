"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchSkuMovements, fetchStoreStock } from "./api";
import { storeStockQueryKeys } from "./query-keys";

export function useStoreStock(search = "", options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: storeStockQueryKeys.list(search.trim()),
    queryFn: () => fetchStoreStock(search),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useSkuMovements(skuId: string | null, warehouseId: string | null, enabled = true) {
  return useQuery({
    queryKey: storeStockQueryKeys.movements(skuId ?? "", warehouseId ?? ""),
    queryFn: () => fetchSkuMovements(skuId as string, warehouseId as string),
    enabled: enabled && Boolean(skuId && warehouseId),
  });
}
