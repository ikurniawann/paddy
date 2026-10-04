// API functions for candidates with proper error handling
import { CandidateFilterParams, CandidatesResponse } from "@/hooks/use-candidates";

export async function fetchCandidates(
  params: CandidateFilterParams
): Promise<CandidatesResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.status) searchParams.set("status", params.status);
  if (params.brand_id) searchParams.set("brand_id", params.brand_id);
  if (params.search) searchParams.set("search", params.search);
  searchParams.set("page", String(params.page || 1));
  searchParams.set("limit", String(params.limit || 20));

  const response = await fetch(`/api/candidates?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal mengambil data kandidat");
  }

  return response.json();
}

export async function fetchCandidateById(id: string): Promise<any> {
  const response = await fetch(`/api/candidates/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal mengambil detail kandidat");
  }

  const { data } = await response.json();
  return data;
}

export async function createCandidate(data: any): Promise<any> {
  const response = await fetch("/api/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal menambahkan kandidat");
  }

  const result = await response.json();
  return result.data;
}

export async function updateCandidate(id: string, data: any): Promise<any> {
  const response = await fetch(`/api/candidates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal mengupdate kandidat");
  }

  const result = await response.json();
  return result.data;
}

export async function deleteCandidate(id: string): Promise<void> {
  const response = await fetch(`/api/candidates/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal menghapus kandidat");
  }
}
