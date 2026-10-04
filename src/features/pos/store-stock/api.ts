import type {
  SetLocationStockPayload,
  StockMovementRow,
  StoreStockResponse,
} from "./types";

async function parseResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.error || fallbackError);
  }
  return json.data as T;
}

export async function fetchStoreStock(search = ""): Promise<StoreStockResponse> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  const qs = params.toString();
  const response = await fetch(`/api/pos/store-stock${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  const data = await parseResponse<StoreStockResponse>(response, "Gagal memuat stok per toko");
  return { locations: data?.locations ?? [], products: data?.products ?? [] };
}

export async function setLocationStock(
  payload: SetLocationStockPayload
): Promise<{ quantity_after: number }> {
  const response = await fetch("/api/pos/store-stock", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, "Gagal menyimpan koreksi stok");
}

export async function fetchSkuMovements(
  skuId: string,
  warehouseId: string,
  limit = 50
): Promise<StockMovementRow[]> {
  const params = new URLSearchParams({ sku_id: skuId, warehouse_id: warehouseId, limit: String(limit) });
  const response = await fetch(`/api/pos/store-stock/movements?${params.toString()}`, {
    cache: "no-store",
  });
  const data = await parseResponse<StockMovementRow[]>(response, "Gagal memuat kartu stok");
  return data ?? [];
}
