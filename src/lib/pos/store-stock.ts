// Multi-toko (stok per toko) — helper murni tanpa DB supaya mudah diuji.
//
// Produk merchandise ber-store_scope 'all' dijual di semua toko; stok varian
// disimpan per toko di pos.pos_sku_stock_locations dan
// pos_product_skus.stock_quantity = total semua toko. Lihat migrasi
// 20261004120000_pos_multi_store_stock.sql.

export type StoreScope = "stall" | "all";

export const STORE_SCOPE_LABEL: Record<StoreScope, string> = {
  stall: "Satu stall",
  all: "Semua toko",
};

export function normalizeStoreScope(value: unknown): StoreScope | null {
  if (value === "all" || value === "stall") return value;
  return null;
}

export function isAllStoresProduct(product: { store_scope?: unknown } | null | undefined): boolean {
  return product?.store_scope === "all";
}

/** Stok varian di satu toko: sku_id → qty. */
export type StoreSkuStock = { warehouseId: string; bySku: Map<string, number> };

type SkuRow = { id?: unknown; stock_quantity?: unknown } & Record<string, unknown>;

/**
 * Katalog kasir: ganti stok varian produk multi-toko dengan stok toko aktif
 * (stok total tetap tersedia di `stock_total`). Produk lain tidak berubah.
 */
export function applyStoreSkuStock<T extends Record<string, unknown>>(
  product: T,
  storeStock: StoreSkuStock | null
): T {
  if (!storeStock || !isAllStoresProduct(product) || !Array.isArray(product.skus)) {
    return product;
  }
  const skus = (product.skus as SkuRow[]).map((sku) => ({
    ...sku,
    stock_total: Number(sku.stock_quantity) || 0,
    stock_quantity: storeStock.bySku.get(String(sku.id)) ?? 0,
  }));
  return { ...product, skus, stock_warehouse_id: storeStock.warehouseId };
}

/** Id varian dari produk multi-toko di daftar produk katalog. */
export function collectAllStoresSkuIds(products: Array<Record<string, unknown>>): string[] {
  const ids: string[] = [];
  for (const product of products) {
    if (!isAllStoresProduct(product) || !Array.isArray(product.skus)) continue;
    for (const sku of product.skus as SkuRow[]) {
      if (sku?.id) ids.push(String(sku.id));
    }
  }
  return ids;
}

export type StockTransferStatus = "draft" | "sent" | "received" | "cancelled";

export const STOCK_TRANSFER_STATUS_LABEL: Record<StockTransferStatus, string> = {
  draft: "Draft",
  sent: "Dalam pengiriman",
  received: "Diterima",
  cancelled: "Dibatalkan",
};

export type StockTransferAction = "send" | "receive" | "cancel";

/** Aksi yang sah per status transfer (mesin status sama dengan fungsi SQL). */
export function allowedTransferActions(status: StockTransferStatus): StockTransferAction[] {
  switch (status) {
    case "draft":
      return ["send", "cancel"];
    case "sent":
      return ["receive", "cancel"];
    default:
      return [];
  }
}

export type TransferLineInput = { sku_id?: unknown; qty?: unknown };

/**
 * Validasi isi transfer: lokasi asal ≠ tujuan, minimal satu baris, qty > 0,
 * varian yang sama digabung (tabel item unik per transfer+varian).
 */
export function normalizeTransferInput(input: {
  from_warehouse_id?: unknown;
  to_warehouse_id?: unknown;
  items?: unknown;
}):
  | { ok: true; fromId: string; toId: string; items: Array<{ skuId: string; qty: number }> }
  | { ok: false; error: string } {
  const fromId = String(input.from_warehouse_id ?? "").trim();
  const toId = String(input.to_warehouse_id ?? "").trim();
  if (!fromId || !toId) return { ok: false, error: "Lokasi asal dan tujuan wajib diisi" };
  if (fromId === toId) return { ok: false, error: "Lokasi asal dan tujuan tidak boleh sama" };
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Tambahkan minimal satu barang" };
  }
  const merged = new Map<string, number>();
  for (const raw of input.items as TransferLineInput[]) {
    const skuId = String(raw?.sku_id ?? "").trim();
    const qty = Number(raw?.qty);
    if (!skuId) return { ok: false, error: "Varian barang wajib dipilih" };
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return { ok: false, error: "Jumlah transfer harus bilangan bulat lebih dari 0" };
    }
    merged.set(skuId, (merged.get(skuId) ?? 0) + qty);
  }
  return {
    ok: true,
    fromId,
    toId,
    items: [...merged.entries()].map(([skuId, qty]) => ({ skuId, qty })),
  };
}

/** Stok absolut hasil koreksi: bilangan bulat ≥ 0. */
export function parseStockQuantity(value: unknown): number | null {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) return null;
  return qty;
}
