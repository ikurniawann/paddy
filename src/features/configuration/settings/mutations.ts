"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSettingsBrand,
  createSettingsPosition,
  updateSettingsBrand,
  updateSettingsPosition,
} from "./api";
import { settingsQueryKeys } from "./query-keys";
import type {
  CreateBrandPayload,
  CreateSettingsPositionPayload,
  UpdateBrandPayload,
  UpdateSettingsPositionPayload,
} from "./types";

export const useCreateSettingsBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBrandPayload) => createSettingsBrand(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.brands() });
    },
  });
};

export const useUpdateSettingsBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBrandPayload }) =>
      updateSettingsBrand(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.brands() });
    },
  });
};

export const useCreateSettingsPosition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSettingsPositionPayload) => createSettingsPosition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.positions() });
    },
  });
};

export const useUpdateSettingsPosition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSettingsPositionPayload }) =>
      updateSettingsPosition(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.positions() });
    },
  });
};
