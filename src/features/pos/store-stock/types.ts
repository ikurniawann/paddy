// Multi-toko — bentuk data dari API stok per toko (sumber: lib/pos/store-stock-server).
export type {
  StockLocation,
  StoreStockProduct,
  StoreStockSku,
  StockMovementRow,
} from "@/lib/pos/store-stock-server";

import type { StockLocation, StoreStockProduct } from "@/lib/pos/store-stock-server";

export type StoreStockResponse = {
  locations: StockLocation[];
  products: StoreStockProduct[];
};

export type SetLocationStockPayload = {
  sku_id: string;
  warehouse_id: string;
  stock_quantity: number;
  note?: string;
};

/** Sel yang dipilih untuk koreksi stok / kartu stok. */
export type StockCellSelection = {
  productName: string;
  skuId: string;
  sku: string;
  skuName: string;
  warehouseId: string;
  warehouseName: string;
  qty: number;
};
