import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const setSkuLocationStock = vi.fn();
vi.mock("@/lib/api/scope", () => ({ getApiUserScope: vi.fn(async () => ({ userId: "user-1" })) }));
const loadManageable = vi.fn(async (..._args: unknown[]): Promise<Set<string> | null> => null);

vi.mock("@/lib/api/auth", () => ({
  requirePosMenu: vi.fn(async () => ({ error: null, userId: "user-1", user: { id: "user-1" } })),
}));
vi.mock("@/lib/pos/store-stock-server", () => ({
  StoreStockError: class extends Error {},
  listStockLocations: vi.fn(async () => []),
  listStoreStock: vi.fn(async () => []),
  setSkuLocationStock: (...args: unknown[]) => setSkuLocationStock(...args),
  loadManageableWarehouseIds: (...args: unknown[]) => loadManageable(...args),
  canManageLocation: (m: Set<string> | null, id: string) => m === null || m.has(id),
  transferActionLocation: (action: string, t: { from_warehouse_id: string; to_warehouse_id: string }) =>
    action === "receive" ? t.to_warehouse_id : t.from_warehouse_id,
}));

function patch(body: unknown) {
  return new NextRequest("http://localhost/api/pos/store-stock", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/pos/store-stock — koreksi stok toko", () => {
  beforeEach(() => {
    setSkuLocationStock.mockReset();
    loadManageable.mockReset();
    loadManageable.mockResolvedValue(null);
  });

  it("stok absolut valid diteruskan dengan user sesi", async () => {
    setSkuLocationStock.mockResolvedValue({ quantity_after: 7 });
    const { PATCH } = await import("./route");
    const res = await PATCH(patch({ sku_id: "s1", warehouse_id: "pvj", stock_quantity: "7", note: "opname" }));
    expect(res.status).toBe(200);
    expect(setSkuLocationStock).toHaveBeenCalledWith({
      skuId: "s1",
      warehouseId: "pvj",
      qty: 7,
      userId: "user-1",
      note: "opname",
    });
  });

  it("stok negatif / pecahan ditolak", async () => {
    const { PATCH } = await import("./route");
    expect((await PATCH(patch({ sku_id: "s1", warehouse_id: "pvj", stock_quantity: -1 }))).status).toBe(400);
    expect((await PATCH(patch({ sku_id: "s1", warehouse_id: "pvj", stock_quantity: 1.5 }))).status).toBe(400);
    expect(setSkuLocationStock).not.toHaveBeenCalled();
  });

  it("akun toko tidak bisa mengoreksi stok toko lain", async () => {
    loadManageable.mockResolvedValue(new Set(["pvj"]));
    const { PATCH } = await import("./route");
    const res = await PATCH(patch({ sku_id: "s1", warehouse_id: "blokm", stock_quantity: 3 }));
    expect(res.status).toBe(403);
    expect(setSkuLocationStock).not.toHaveBeenCalled();
  });
});
