"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchOrderPayment, saveOrderSplits } from "./api";
import { openBillsQueryKeys } from "./query-keys";
import type { UpdateOrderPaymentPayload } from "./types";

export const useUpdateOrderPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: UpdateOrderPaymentPayload }) =>
      patchOrderPayment(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openBillsQueryKeys.all });
    },
  });
};

export const useCreateOrderSplits = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: Parameters<typeof saveOrderSplits>[1];
    }) => saveOrderSplits(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openBillsQueryKeys.all });
    },
  });
};
