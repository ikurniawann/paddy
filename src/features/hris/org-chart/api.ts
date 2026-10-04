import { apiGet } from "@/lib/api-client";
import { createBrowserClient } from "@/lib/pg/browser-client";
import type { OrgDepartment, OrgEmployee } from "./types";

export const fetchOrgEmployees = () =>
  apiGet<{ data: OrgEmployee[] }>(
    "/api/hris/employees?limit=200&is_active=true"
  ).then((res) => res.data || []);

export async function fetchOrgDepartments(): Promise<OrgDepartment[]> {
  const db = createBrowserClient();
  const { data } = await db
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return (data as OrgDepartment[]) || [];
}
