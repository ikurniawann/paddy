import { createOrderSplits, getOrders, updateOrderPayment } from "@/lib/pos-api";
import type { Order } from "@/lib/pos-api";
import type { OpenBillsListParams, UpdateOrderPaymentPayload } from "./types";

export type * from "./types";

export async function listOpenBills(params: OpenBillsListParams = {}): Promise<Order[]> {
  const res = await getOrders({
    active_only: true,
    limit: params.limit ?? 200,
  });
  if (!res.success) {
    throw new Error("Gagal memuat open bill");
  }
  return (res.data ?? []) as Order[];
}

export async function patchOrderPayment(orderId: string, payload: UpdateOrderPaymentPayload) {
  return updateOrderPayment(orderId, payload);
}

export async function saveOrderSplits(
  orderId: string,
  payload: Parameters<typeof createOrderSplits>[1]
) {
  return createOrderSplits(orderId, payload);
}
