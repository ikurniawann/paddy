"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setLocationStock } from "./api";
import { storeStockQueryKeys } from "./query-keys";
import type { SetLocationStockPayload } from "./types";

export function useSetLocationStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetLocationStockPayload) => setLocationStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeStockQueryKeys.all });
    },
  });
}
