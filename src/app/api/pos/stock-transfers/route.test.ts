import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createStockTransfer = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requirePosMenu: vi.fn(async () => ({ error: null, userId: "user-1", user: { id: "user-1" } })),
}));
vi.mock("@/lib/pos/store-stock-server", () => ({
  StoreStockError: class extends Error {},
  createStockTransfer: (...args: unknown[]) => createStockTransfer(...args),
  listStockTransfers: vi.fn(async () => []),
}));

function post(body: unknown) {
  return new NextRequest("http://localhost/api/pos/stock-transfers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/stock-transfers", () => {
  beforeEach(() => createStockTransfer.mockReset());

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
});
