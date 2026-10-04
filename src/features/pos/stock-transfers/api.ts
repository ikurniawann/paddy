import type {
  CreateStockTransferPayload,
  StockTransferAction,
  StockTransferDetail,
  StockTransferFilter,
  StockTransferRow,
} from "./types";

async function parseResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.error || fallbackError);
  }
  return json.data as T;
}

export async function fetchStockTransfers(filter: StockTransferFilter): Promise<StockTransferRow[]> {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.warehouseId) params.set("warehouse_id", filter.warehouseId);
  const qs = params.toString();
  const response = await fetch(`/api/pos/stock-transfers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  const data = await parseResponse<StockTransferRow[]>(response, "Gagal memuat transfer stok");
  return data ?? [];
}

export async function fetchStockTransfer(id: string): Promise<StockTransferDetail> {
  const response = await fetch(`/api/pos/stock-transfers/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  return parseResponse<StockTransferDetail>(response, "Gagal memuat detail transfer");
}

export async function createStockTransfer(
  payload: CreateStockTransferPayload
): Promise<{ id: string; transfer_no: string }> {
  const response = await fetch("/api/pos/stock-transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, "Gagal membuat transfer stok");
}

export async function runStockTransferAction(
  id: string,
  action: StockTransferAction
): Promise<StockTransferDetail> {
  const response = await fetch(`/api/pos/stock-transfers/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  return parseResponse<StockTransferDetail>(response, "Gagal memproses transfer");
}
