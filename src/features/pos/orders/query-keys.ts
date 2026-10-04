import type { CustomerListParams, OrderListParams } from "./types";

export const ordersQueryKeys = {
  all: ["pos", "orders"] as const,
  list: (params: OrderListParams) => ["pos", "orders", "list", params] as const,
  customers: (params: CustomerListParams) => ["pos", "orders", "customers", params] as const,
};
