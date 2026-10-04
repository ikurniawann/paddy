import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatQtyChange,
  movementTypeLabel,
  parseStockInput,
  skuStockAt,
  stockCellClass,
  stockTone,
  summarizeStoreStock,
} from "./helpers";
import type { StockLocation, StoreStockProduct, StoreStockSku } from "./types";

function location(id: string, name = id): StockLocation {
  return {
    warehouse_id: id,
    warehouse_code: id.toUpperCase(),
    warehouse_name: name,
    branch_id: `b-${id}`,
    branch_code: id,
    branch_name: name,
  };
}

function sku(id: string, stock: Record<string, number>, isActive = true): StoreStockSku {
  return {
    sku_id: id,
    sku: id.toUpperCase(),
    sku_name: id,
    barcode: null,
    is_active: isActive,
    stock_total: Object.values(stock).reduce((sum, qty) => sum + qty, 0),
    stock_by_location: stock,
  };
}

function product(id: string, skus: StoreStockSku[]): StoreStockProduct {
  return {
    product_id: id,
    product_name: id,
    product_sku: id,
    category_name: null,
    image_url: null,
    home_warehouse_id: "hq",
    skus,
  };
}

describe("stockTone", () => {
  it("menandai 0 sebagai kosong, ≤3 menipis, sisanya aman", () => {
    expect(stockTone(0)).toBe("empty");
    expect(stockTone(-2)).toBe("empty");
    expect(stockTone(1)).toBe("low");
    expect(stockTone(3)).toBe("low");
    expect(stockTone(4)).toBe("ok");
    expect(stockTone(Number.NaN)).toBe("empty");
  });

  it("memetakan tone ke kelas warna", () => {
    expect(stockCellClass(0)).toContain("red");
    expect(stockCellClass(2)).toContain("amber");
    expect(stockCellClass(10)).not.toMatch(/red|amber/);
  });
});

describe("summarizeStoreStock", () => {
  const locations = [location("hq"), location("pvj"), location("blokm")];

  it("menjumlah unit per lokasi dan menghitung varian kosong di salah satu toko", () => {
    const products = [
      product("kaos", [
        sku("kaos-s", { hq: 10, pvj: 2, blokm: 0 }),
        sku("kaos-m", { hq: 5, pvj: 5, blokm: 5 }),
      ]),
      product("topi", [sku("topi-1", { hq: 3 })]),
    ];
    const summary = summarizeStoreStock(products, locations);
    expect(summary.totalsByLocation).toEqual({ hq: 18, pvj: 7, blokm: 5 });
    expect(summary.grandTotal).toBe(30);
    expect(summary.skuCount).toBe(3);
    // kaos-s kosong di Blok M, topi-1 tidak punya baris stok di PVJ & Blok M
    expect(summary.skusWithEmptyStore).toBe(2);
  });

  it("mengabaikan varian nonaktif untuk hitungan kosong", () => {
    const summary = summarizeStoreStock(
      [product("kaos", [sku("kaos-xl", { hq: 0 }, false)])],
      locations
    );
    expect(summary.skusWithEmptyStore).toBe(0);
    expect(summary.skuCount).toBe(1);
  });

  it("aman untuk data kosong", () => {
    expect(summarizeStoreStock([], [])).toEqual({
      totalsByLocation: {},
      grandTotal: 0,
      skuCount: 0,
      skusWithEmptyStore: 0,
    });
  });
});

describe("skuStockAt", () => {
  it("mengembalikan 0 bila lokasi tidak ada", () => {
    expect(skuStockAt(sku("a", { hq: 4 }), "hq")).toBe(4);
    expect(skuStockAt(sku("a", { hq: 4 }), "pvj")).toBe(0);
  });
});

describe("parseStockInput", () => {
  it("hanya menerima bilangan bulat ≥ 0", () => {
    expect(parseStockInput("0")).toBe(0);
    expect(parseStockInput(" 12 ")).toBe(12);
    expect(parseStockInput("")).toBeNull();
    expect(parseStockInput("-1")).toBeNull();
    expect(parseStockInput("1.5")).toBeNull();
    expect(parseStockInput("abc")).toBeNull();
  });
});

describe("movement & format helpers", () => {
  it("memberi label Indonesia untuk tipe mutasi", () => {
    expect(movementTypeLabel("transfer_out")).toBe("Transfer keluar");
    expect(movementTypeLabel("adjustment")).toBe("Koreksi");
    expect(movementTypeLabel("sale_restore")).toBe("Batal jual");
    expect(movementTypeLabel("unknown_type")).toBe("unknown_type");
  });

  it("memformat perubahan qty dengan tanda", () => {
    expect(formatQtyChange(5)).toBe("+5");
    expect(formatQtyChange(-3)).toBe("-3");
    expect(formatQtyChange(0)).toBe("0");
    expect(formatQtyChange(1500)).toBe("+1.500");
  });

  it("formatDateTime menangani nilai kosong / tidak valid", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("bukan tanggal")).toBe("-");
    expect(formatDateTime("2026-10-04T08:30:00Z")).toMatch(/2026/);
  });
});
