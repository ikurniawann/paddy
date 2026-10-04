// Helper murni halaman Stok per Toko (tanpa React) — mudah diuji.
import type { StockLocation, StoreStockProduct } from "./types";

export const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  initial: "Stok awal",
  sale: "Penjualan",
  sale_restore: "Batal jual",
  receive: "Penerimaan",
  transfer_out: "Transfer keluar",
  transfer_in: "Transfer masuk",
  transfer_cancel: "Transfer batal",
  adjustment: "Koreksi",
};

export function movementTypeLabel(type: string): string {
  return MOVEMENT_TYPE_LABEL[type] ?? type;
}

/** Batas stok "menipis" di satu toko. */
export const LOW_STOCK_THRESHOLD = 3;

export type StockTone = "empty" | "low" | "ok";

export function stockTone(qty: number, lowThreshold = LOW_STOCK_THRESHOLD): StockTone {
  if (!Number.isFinite(qty) || qty <= 0) return "empty";
  if (qty <= lowThreshold) return "low";
  return "ok";
}

export const STOCK_TONE_CLASS: Record<StockTone, string> = {
  empty: "bg-red-50 text-red-700",
  low: "bg-amber-50 text-amber-700",
  ok: "text-gray-900",
};

export function stockCellClass(qty: number): string {
  return STOCK_TONE_CLASS[stockTone(qty)];
}

export function skuStockAt(
  sku: { stock_by_location: Record<string, number> },
  warehouseId: string
): number {
  return Number(sku.stock_by_location?.[warehouseId]) || 0;
}

export type StoreStockSummary = {
  totalsByLocation: Record<string, number>;
  grandTotal: number;
  skuCount: number;
  /** Varian aktif yang stoknya 0 di minimal satu toko. */
  skusWithEmptyStore: number;
};

export function summarizeStoreStock(
  products: StoreStockProduct[],
  locations: StockLocation[]
): StoreStockSummary {
  const totalsByLocation: Record<string, number> = {};
  for (const location of locations) totalsByLocation[location.warehouse_id] = 0;
  let grandTotal = 0;
  let skuCount = 0;
  let skusWithEmptyStore = 0;

  for (const product of products) {
    for (const sku of product.skus) {
      skuCount += 1;
      let hasEmpty = false;
      for (const location of locations) {
        const qty = skuStockAt(sku, location.warehouse_id);
        totalsByLocation[location.warehouse_id] += qty;
        grandTotal += qty;
        if (qty <= 0) hasEmpty = true;
      }
      if (sku.is_active && hasEmpty && locations.length > 0) skusWithEmptyStore += 1;
    }
  }

  return { totalsByLocation, grandTotal, skuCount, skusWithEmptyStore };
}

/** Input koreksi stok: string → bilangan bulat ≥ 0, selain itu null. */
export function parseStockInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const qty = Number(trimmed);
  return Number.isSafeInteger(qty) ? qty : null;
}

export function formatQtyChange(change: number): string {
  if (change > 0) return `+${formatQty(change)}`;
  if (change < 0) return `-${formatQty(Math.abs(change))}`;
  return "0";
}

const qtyFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatQty(value: number): string {
  return qtyFormatter.format(Number(value) || 0);
}

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateTimeFormatter.format(date);
}
