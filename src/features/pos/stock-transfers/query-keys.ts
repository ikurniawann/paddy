import type { StockTransferFilter } from "./types";

export const stockTransfersQueryKeys = {
  all: ["pos", "stock-transfers"] as const,
  list: (filter: StockTransferFilter) => [...stockTransfersQueryKeys.all, "list", filter] as const,
  detail: (id: string) => [...stockTransfersQueryKeys.all, "detail", id] as const,
};
