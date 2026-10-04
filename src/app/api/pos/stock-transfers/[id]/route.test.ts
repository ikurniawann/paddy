import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getStockTransfer = vi.fn();
const runStockTransferAction = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requirePosMenu: vi.fn(async () => ({ error: null, userId: "user-1", user: { id: "user-1" } })),
}));
vi.mock("@/lib/pos/store-stock-server", async () => {
  class StoreStockError extends Error {
    constructor(message: string, public status = 400) {
      super(message);
    }
  }
  return {
    StoreStockError,
    getStockTransfer: (...args: unknown[]) => getStockTransfer(...args),
    runStockTransferAction: (...args: unknown[]) => runStockTransferAction(...args),
  };
});

function post(body: unknown) {
  return new NextRequest("http://localhost/api/pos/stock-transfers/t1", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: "t1" }) };

describe("POST /api/pos/stock-transfers/[id] — aksi transfer", () => {
  beforeEach(() => {
    getStockTransfer.mockReset();
    runStockTransferAction.mockReset();
  });

  it("draft → send dijalankan dengan user sesi", async () => {
    getStockTransfer.mockResolvedValue({ id: "t1", status: "draft", items: [] });
    const { POST } = await import("./route");
    const res = await POST(post({ action: "send" }), ctx);
    expect(res.status).toBe(200);
    expect(runStockTransferAction).toHaveBeenCalledWith("t1", "send", "user-1");
  });

  it("aksi tidak sah untuk status → 400 tanpa menyentuh stok", async () => {
    getStockTransfer.mockResolvedValue({ id: "t1", status: "received", items: [] });
    const { POST } = await import("./route");
    const res = await POST(post({ action: "cancel" }), ctx);
    expect(res.status).toBe(400);
    expect(runStockTransferAction).not.toHaveBeenCalled();
  });

  it("transfer tidak ada → 404", async () => {
    getStockTransfer.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(post({ action: "send" }), ctx);
    expect(res.status).toBe(404);
  });

  it("pesan stok kurang dari SQL diteruskan sebagai 400", async () => {
    getStockTransfer.mockResolvedValue({ id: "t1", status: "draft", items: [] });
    const { StoreStockError } = await import("@/lib/pos/store-stock-server");
    runStockTransferAction.mockRejectedValue(
      new StoreStockError("Stok Paddywatch Nea Silver di lokasi asal tidak cukup untuk dikirim 9")
    );
    const { POST } = await import("./route");
    const res = await POST(post({ action: "send" }), ctx);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("tidak cukup");
  });
});
