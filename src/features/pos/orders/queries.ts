"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listCustomers, listOrders } from "./api";
import { ordersQueryKeys } from "./query-keys";
import type { CustomerListParams, OrderListParams } from "./types";

export const useOrderList = (params: OrderListParams = { limit: 100 }) =>
  useQuery({
    queryKey: ordersQueryKeys.list(params),
    queryFn: () => listOrders(params),
    placeholderData: keepPreviousData,
  });

export const useCustomerList = (params: CustomerListParams, enabled = true) =>
  useQuery({
    queryKey: ordersQueryKeys.customers(params),
    queryFn: () => listCustomers(params),
    enabled,
    placeholderData: keepPreviousData,
  });
