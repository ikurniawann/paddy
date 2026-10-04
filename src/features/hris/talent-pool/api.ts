import { createBrowserClient } from "@/lib/pg/browser-client";
import { apiPost } from "@/lib/api-client";
import type { Brand } from "@/types";
import type {
  TalentPoolCandidate,
  SendCandidateNotificationPayload,
} from "./types";

export async function fetchTalentPool(brandId?: string): Promise<TalentPoolCandidate[]> {
  const db = createBrowserClient();
  let query = db
    .from("candidates")
    .select("*, brands(name), positions(title)")
    .eq("status", "talent_pool");

  if (brandId && brandId !== "all") {
    query = query.eq("brand_id", brandId);
  }

  const { data } = await query;
  return (data as TalentPoolCandidate[]) || [];
}

export async function fetchActiveBrands(): Promise<Brand[]> {
  const db = createBrowserClient();
  const { data } = await db
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return (data as Brand[]) || [];
}

export async function updateCandidateStatus(id: string, status: string) {
  const db = createBrowserClient();
  const { error } = await db
    .from("candidates")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function touchCandidateContact(id: string) {
  const db = createBrowserClient();
  const { error } = await db
    .from("candidates")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export const sendCandidateNotification = (body: SendCandidateNotificationPayload) =>
  apiPost<{ success?: boolean }>("/api/notifications/send", body);
