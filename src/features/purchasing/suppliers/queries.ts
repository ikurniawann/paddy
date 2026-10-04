"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { SupplierListParams } from "@/types/supplier";
import { suppliersQueryKeys } from "./query-keys";
import { listSuppliers, getSupplier, getSupplierPOHistory } from "@/lib/purchasing/supplier";

export const useSupplierList = (params: SupplierListParams) =>
  useQuery({
    queryKey: suppliersQueryKeys.list(params),
    queryFn: () => listSuppliers(params),
    placeholderData: keepPreviousData,
  });

export const useSupplier = (id: string) =>
  useQuery({
    queryKey: suppliersQueryKeys.detail(id),
    queryFn: () => getSupplier(id),
    enabled: !!id,
  });

export const useSupplierPOHistory = (id: string) =>
  useQuery({
    queryKey: suppliersQueryKeys.poHistory(id),
    queryFn: () => getSupplierPOHistory(id),
    enabled: !!id,
  });
