import { apiGet, apiPost } from "@/lib/api-client";
import type {
  BusinessTree,
  CreateBusinessPayload,
  UpdateBusinessPayload,
  BusinessEntityType,
} from "./types";

const BASE = "/api/settings/business";

export async function fetchBusinessTree(): Promise<BusinessTree> {
  const res = await apiGet<{ data: BusinessTree }>(BASE);
  return res.data;
}

export async function createBusinessEntity(payload: CreateBusinessPayload) {
  return apiPost<{ data: { id: string; type: BusinessEntityType }; tree: BusinessTree }>(
    BASE,
    payload
  );
}

export async function updateBusinessEntity(
  type: BusinessEntityType,
  id: string,
  payload: UpdateBusinessPayload
) {
  const response = await fetch(`${BASE}/${type}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Gagal memperbarui data");
  }
  return json as { data: { id: string }; tree: BusinessTree };
}

export async function deleteBusinessEntity(type: BusinessEntityType, id: string) {
  const response = await fetch(`${BASE}/${type}/${id}`, { method: "DELETE" });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Gagal menghapus data");
  }
  return json as { data: { id: string }; tree: BusinessTree };
}
