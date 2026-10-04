import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createStockTransfer = vi.fn();
vi.mock("@/lib/api/scope", () => ({ getApiUserScope: vi.fn(async () => ({ userId: "user-1" })) }));
const loadManageable = vi.fn(async (..._args: unknown[]): Promise<Set<string> | null> => null);

vi.mock("@/lib/api/auth", () => ({
  requirePosMenu: vi.fn(async () => ({ error: null, userId: "user-1", user: { id: "user-1" } })),
}));
vi.mock("@/lib/pos/store-stock-server", () => ({
  StoreStockError: class extends Error {},
  createStockTransfer: (...args: unknown[]) => createStockTransfer(...args),
  listStockTransfers: vi.fn(async () => []),
  loadManageableWarehouseIds: (...args: unknown[]) => loadManageable(...args),
  canManageLocation: (m: Set<string> | null, id: string) => m === null || m.has(id),
  transferActionLocation: (action: string, t: { from_warehouse_id: string; to_warehouse_id: string }) =>
    action === "receive" ? t.to_warehouse_id : t.from_warehouse_id,
}));

function post(body: unknown) {
  return new NextRequest("http://localhost/api/pos/stock-transfers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/stock-transfers", () => {
  beforeEach(() => {
    createStockTransfer.mockReset();
    loadManageable.mockReset();
    loadManageable.mockResolvedValue(null);
  });

  it("input valid → transfer dibuat (baris digabung, send diteruskan)", async () => {
    createStockTransfer.mockResolvedValue({ id: "t1", transfer_no: "TRF-261004-0001" });
    const { POST } = await import("./route");
    const res = await POST(
      post({
        from_warehouse_id: "hq",
        to_warehouse_id: "pvj",
        items: [
          { sku_id: "s1", qty: 2 },
          { sku_id: "s1", qty: 1 },
        ],
        send: true,
      })
    );
    expect(res.status).toBe(201);
    expect(createStockTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        fromId: "hq",
        toId: "pvj",
        items: [{ skuId: "s1", qty: 3 }],
        userId: "user-1",
        send: true,
      })
    );
  });

  it("asal = tujuan → 400 tanpa membuat transfer", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      post({ from_warehouse_id: "hq", to_warehouse_id: "hq", items: [{ sku_id: "s1", qty: 1 }] })
    );
    expect(res.status).toBe(400);
    expect(createStockTransfer).not.toHaveBeenCalled();
  });

  it("akun toko boleh draft permintaan dari HQ, tapi tidak boleh langsung kirim", async () => {
    loadManageable.mockResolvedValue(new Set(["pvj"]));
    createStockTransfer.mockResolvedValue({ id: "t2", transfer_no: "TRF-2" });
    const { POST } = await import("./route");
    const body = { from_warehouse_id: "hq", to_warehouse_id: "pvj", items: [{ sku_id: "s1", qty: 1 }] };
    expect((await POST(post({ ...body, send: true }))).status).toBe(403);
    expect((await POST(post(body))).status).toBe(201);
    expect((await POST(post({ ...body, to_warehouse_id: "blokm" }))).status).toBe(403);
    expect(createStockTransfer).toHaveBeenCalledTimes(1);
  });
});
