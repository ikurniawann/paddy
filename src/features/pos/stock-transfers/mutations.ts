"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { storeStockQueryKeys } from "@/features/pos/store-stock/query-keys";
import { createStockTransfer, runStockTransferAction } from "./api";
import { stockTransfersQueryKeys } from "./query-keys";
import type { CreateStockTransferPayload, StockTransferAction } from "./types";

function useInvalidateTransfersAndStock() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: stockTransfersQueryKeys.all });
    // Kirim/terima/batal mengubah stok per toko.
    queryClient.invalidateQueries({ queryKey: storeStockQueryKeys.all });
  };
}

export function useCreateStockTransfer() {
  const invalidate = useInvalidateTransfersAndStock();
  return useMutation({
    mutationFn: (payload: CreateStockTransferPayload) => createStockTransfer(payload),
    onSuccess: invalidate,
  });
}

export function useStockTransferAction() {
  const invalidate = useInvalidateTransfersAndStock();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: StockTransferAction }) =>
      runStockTransferAction(id, action),
    onSuccess: invalidate,
  });
}
