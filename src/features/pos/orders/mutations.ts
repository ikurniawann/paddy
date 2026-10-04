"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchOrderStatus } from "./api";
import { ordersQueryKeys } from "./query-keys";
import type { UpdateOrderStatusPayload } from "./types";

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: UpdateOrderStatusPayload }) =>
      patchOrderStatus(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all });
    },
  });
};
