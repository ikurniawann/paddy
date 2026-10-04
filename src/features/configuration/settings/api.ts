import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import type {
  CreateBrandPayload,
  CreateSettingsPositionPayload,
  SettingsBrand,
  SettingsPosition,
  UpdateBrandPayload,
  UpdateSettingsPositionPayload,
} from "./types";

export type * from "./types";

const BRANDS_BASE = "/api/brands";
const POSITIONS_BASE = "/api/master/positions";

export async function listSettingsBrands(): Promise<SettingsBrand[]> {
  const res = await apiGet<{ data: SettingsBrand[] }>(BRANDS_BASE);
  return res.data ?? [];
}

export async function createSettingsBrand(payload: CreateBrandPayload): Promise<SettingsBrand> {
  const res = await apiPost<{ data: SettingsBrand }>(BRANDS_BASE, payload);
  return res.data;
}

export async function updateSettingsBrand(id: string, payload: UpdateBrandPayload): Promise<SettingsBrand> {
  const response = await fetch(`${BRANDS_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Gagal memperbarui outlet");
  }
  return json.data as SettingsBrand;
}

export async function listSettingsPositions(): Promise<SettingsPosition[]> {
  const res = await apiGet<{ data: SettingsPosition[] }>(POSITIONS_BASE);
  return res.data ?? [];
}

export async function createSettingsPosition(payload: CreateSettingsPositionPayload): Promise<SettingsPosition> {
  const res = await apiPost<{ data: SettingsPosition }>(POSITIONS_BASE, payload);
  return res.data;
}

export async function updateSettingsPosition(
  id: string,
  payload: UpdateSettingsPositionPayload
): Promise<SettingsPosition> {
  const res = await apiPut<{ data: SettingsPosition }>(`${POSITIONS_BASE}/${id}`, payload);
  return res.data;
}
