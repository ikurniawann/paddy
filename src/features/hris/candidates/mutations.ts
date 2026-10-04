"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { candidatesQueryKeys } from "./query-keys";
import {
  createCandidate,
  deleteCandidate,
  updateCandidateStatus,
  addCandidateNote,
} from "./api";
import type { CreateCandidatePayload } from "./types";

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, cvFile }: { payload: CreateCandidatePayload; cvFile?: File | null }) =>
      createCandidate(payload, cvFile),
    onSuccess: () => qc.invalidateQueries({ queryKey: candidatesQueryKeys.all }),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCandidate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: candidatesQueryKeys.all }),
  });
}

export function useUpdateCandidateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, description }: { id: string; status: string; description: string }) =>
      updateCandidateStatus(id, status, description),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: candidatesQueryKeys.detail(variables.id) }),
  });
}

export function useAddCandidateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      addCandidateNote(id, content),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: candidatesQueryKeys.detail(variables.id) }),
  });
}
