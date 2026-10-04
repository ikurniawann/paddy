"use client";

import { useQuery } from "@tanstack/react-query";
import { listPosCatalogProducts } from "./api";
import { productsQueryKeys } from "./query-keys";

export const usePosCatalogProducts = () =>
  useQuery({
    queryKey: productsQueryKeys.catalog(),
    queryFn: listPosCatalogProducts,
  });
