import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/pg/browser-client";
import type { Candidate, CandidateStatus } from "@/types";

// Types untuk filter dan pagination
export interface CandidateFilterParams {
  status?: CandidateStatus;
  brand_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CandidatesResponse {
  data: Candidate[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Query key factory
const candidatesKeys = {
  all: ["candidates"] as const,
  lists: (filters: CandidateFilterParams) => 
    [...candidatesKeys.all, "list", filters] as const,
  details: (id: string) => [...candidatesKeys.all, "detail", id] as const,
};

// Fetch candidates dengan filter
async function fetchCandidates(
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

// Fetch single candidate
async function fetchCandidate(id: string): Promise<Candidate> {
  const response = await fetch(`/api/candidates/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal mengambil detail kandidat");
  }

  const { data } = await response.json();
  return data;
}

// Create candidate
async function createCandidate(
  data: Omit<Candidate, "id" | "created_at" | "updated_at" | "status">
): Promise<Candidate> {
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

// Update candidate
async function updateCandidate({
  id,
  data,
}: {
  id: string;
  data: Partial<Candidate>;
}): Promise<Candidate> {
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

// Delete candidate
async function deleteCandidate(id: string): Promise<void> {
  const response = await fetch(`/api/candidates/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal menghapus kandidat");
  }
}

// Hook untuk list candidates dengan pagination
export function useCandidates(params: CandidateFilterParams = {}) {
  return useQuery({
    queryKey: candidatesKeys.lists(params),
    queryFn: () => fetchCandidates(params),
    staleTime: 1000 * 60 * 2, // 2 menit
  });
}

// Hook untuk detail candidate
export function useCandidate(id: string) {
  return useQuery({
    queryKey: candidatesKeys.details(id),
    queryFn: () => fetchCandidate(id),
    enabled: !!id, // Hanya fetch kalau ada ID
    staleTime: 1000 * 60 * 5, // 5 menit untuk detail
  });
}

// Hook untuk create candidate
export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      // Invalidate semua list queries
      queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
    },
  });
}

// Hook untuk update candidate
export function useUpdateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCandidate,
    onSuccess: (data, variables) => {
      // Update cache detail
      queryClient.setQueryData(candidatesKeys.details(variables.id), data);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
    },
  });
}

// Hook untuk delete candidate
export function useDeleteCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
    },
  });
}

// Hook untuk update status (optimistic update)
export function useUpdateCandidateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCandidate,
    onMutate: async ({ id, data }) => {
      // Cancel queries yang sedang berjalan
      await queryClient.cancelQueries({ queryKey: candidatesKeys.details(id) });
      
      // Simpan previous value
      const previousCandidate = queryClient.getQueryData<Candidate>(
        candidatesKeys.details(id)
      );

      // Optimistically update cache
      if (previousCandidate) {
        queryClient.setQueryData(candidatesKeys.details(id), {
          ...previousCandidate,
          ...data,
        });
      }

      return { previousCandidate };
    },
    onError: (err, variables, context) => {
      // Rollback kalau error
      if (context?.previousCandidate) {
        queryClient.setQueryData(
          candidatesKeys.details(variables.id),
          context.previousCandidate
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
      queryClient.invalidateQueries({
        queryKey: candidatesKeys.details(variables.id),
      });
    },
  });
}
