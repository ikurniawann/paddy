import { getCustomers, getOrders, updateOrderStatus } from "@/lib/pos-api";
import type { Customer, Order } from "@/lib/pos-api";
import type { CustomerListParams, OrderListParams, UpdateOrderStatusPayload } from "./types";

export type * from "./types";

export async function listOrders(params: OrderListParams = {}): Promise<Order[]> {
  const res = await getOrders(params);
  if (!res.success) {
    throw new Error("Gagal memuat orders");
  }
  return (res.data ?? []) as Order[];
}

export async function listCustomers(params: CustomerListParams = {}): Promise<Customer[]> {
  const res = await getCustomers(params);
  if (!res.success) {
    throw new Error("Gagal memuat customers");
  }
  return res.data ?? [];
}

export async function patchOrderStatus(orderId: string, payload: UpdateOrderStatusPayload) {
  const { status, ...additionalData } = payload;
  return updateOrderStatus(orderId, status, additionalData);
}
