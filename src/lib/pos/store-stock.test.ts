import { describe, expect, it } from "vitest";
import {
  allowedTransferActions,
  applyStoreSkuStock,
  collectAllStoresSkuIds,
  isAllStoresProduct,
  normalizeStoreScope,
  normalizeTransferInput,
  parseStockQuantity,
} from "./store-stock";

describe("normalizeStoreScope", () => {
  it("hanya menerima 'stall' | 'all'", () => {
    expect(normalizeStoreScope("all")).toBe("all");
    expect(normalizeStoreScope("stall")).toBe("stall");
    expect(normalizeStoreScope("ALL")).toBeNull();
    expect(normalizeStoreScope(undefined)).toBeNull();
  });
});

describe("applyStoreSkuStock — katalog kasir multi-toko", () => {
  const storeStock = { warehouseId: "pvj", bySku: new Map([["s1", 4]]) };

  it("produk multi-toko: stok varian = stok toko aktif, total disimpan", () => {
    const product = {
      id: "p1",
      store_scope: "all",
      skus: [
        { id: "s1", stock_quantity: 20 },
        { id: "s2", stock_quantity: 7 },
      ],
    };
    const out = applyStoreSkuStock(product, storeStock) as typeof product & {
      stock_warehouse_id: string;
      skus: Array<{ id: string; stock_quantity: number; stock_total: number }>;
    };
    expect(out.skus).toEqual([
      { id: "s1", stock_quantity: 4, stock_total: 20 },
      // Varian tanpa baris di toko ini = 0 di toko ini.
      { id: "s2", stock_quantity: 0, stock_total: 7 },
    ]);
    expect(out.stock_warehouse_id).toBe("pvj");
  });

  it("produk satu stall / tanpa toko aktif tidak diubah", () => {
    const stallProduct = { id: "p2", store_scope: "stall", skus: [{ id: "s1", stock_quantity: 20 }] };
    expect(applyStoreSkuStock(stallProduct, storeStock)).toBe(stallProduct);
    const allProduct = { id: "p3", store_scope: "all", skus: [{ id: "s1", stock_quantity: 20 }] };
    expect(applyStoreSkuStock(allProduct, null)).toBe(allProduct);
  });

  it("collectAllStoresSkuIds hanya mengambil varian produk multi-toko", () => {
    expect(
      collectAllStoresSkuIds([
        { store_scope: "all", skus: [{ id: "a" }, { id: "b" }] },
        { store_scope: "stall", skus: [{ id: "c" }] },
        { store_scope: "all", skus: null },
      ])
    ).toEqual(["a", "b"]);
    expect(isAllStoresProduct({ store_scope: "all" })).toBe(true);
    expect(isAllStoresProduct(null)).toBe(false);
  });
});

describe("transfer stok", () => {
  it("aksi per status mengikuti mesin status SQL", () => {
    expect(allowedTransferActions("draft")).toEqual(["send", "cancel"]);
    expect(allowedTransferActions("sent")).toEqual(["receive", "cancel"]);
    expect(allowedTransferActions("received")).toEqual([]);
    expect(allowedTransferActions("cancelled")).toEqual([]);
  });

  it("validasi input: lokasi wajib & berbeda, minimal satu baris", () => {
    expect(normalizeTransferInput({ from_warehouse_id: "a", to_warehouse_id: "a", items: [{ sku_id: "s", qty: 1 }] }))
      .toEqual({ ok: false, error: "Lokasi asal dan tujuan tidak boleh sama" });
    expect(normalizeTransferInput({ from_warehouse_id: "a", items: [] }))
      .toEqual({ ok: false, error: "Lokasi asal dan tujuan wajib diisi" });
    expect(normalizeTransferInput({ from_warehouse_id: "a", to_warehouse_id: "b", items: [] }))
      .toEqual({ ok: false, error: "Tambahkan minimal satu barang" });
  });

  it("qty harus bulat > 0; varian sama digabung", () => {
    expect(
      normalizeTransferInput({ from_warehouse_id: "a", to_warehouse_id: "b", items: [{ sku_id: "s", qty: 1.5 }] }).ok
    ).toBe(false);
    expect(
      normalizeTransferInput({ from_warehouse_id: "a", to_warehouse_id: "b", items: [{ sku_id: "s", qty: 0 }] }).ok
    ).toBe(false);
    expect(
      normalizeTransferInput({
        from_warehouse_id: " a ",
        to_warehouse_id: "b",
        items: [
          { sku_id: "s1", qty: 2 },
          { sku_id: "s2", qty: 1 },
          { sku_id: "s1", qty: 3 },
        ],
      })
    ).toEqual({
      ok: true,
      fromId: "a",
      toId: "b",
      items: [
        { skuId: "s1", qty: 5 },
        { skuId: "s2", qty: 1 },
      ],
    });
  });

  it("parseStockQuantity: bilangan bulat ≥ 0", () => {
    expect(parseStockQuantity("12")).toBe(12);
    expect(parseStockQuantity(0)).toBe(0);
    expect(parseStockQuantity(-1)).toBeNull();
    expect(parseStockQuantity(2.5)).toBeNull();
    expect(parseStockQuantity("abc")).toBeNull();
  });
});
