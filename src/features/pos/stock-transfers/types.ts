// Multi-toko — bentuk data transfer stok antar lokasi (sumber: lib/pos/store-stock-server).
export type { StockTransferRow, StockTransferItemRow } from "@/lib/pos/store-stock-server";
export type { StockTransferAction, StockTransferStatus } from "@/lib/pos/store-stock";

import type { StockTransferItemRow, StockTransferRow } from "@/lib/pos/store-stock-server";

export type StockTransferDetail = StockTransferRow & { items: StockTransferItemRow[] };

export type StockTransferFilter = {
  status: string;
  warehouseId: string;
};

export type CreateStockTransferPayload = {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: Array<{ sku_id: string; qty: number }>;
  notes?: string;
  send?: boolean;
};
