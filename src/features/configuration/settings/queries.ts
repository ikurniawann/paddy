"use client";

import { useQuery } from "@tanstack/react-query";
import { listSettingsBrands, listSettingsPositions } from "./api";
import { settingsQueryKeys } from "./query-keys";

export const useSettingsBrands = () =>
  useQuery({
    queryKey: settingsQueryKeys.brands(),
    queryFn: listSettingsBrands,
  });

export const useSettingsPositions = () =>
  useQuery({
    queryKey: settingsQueryKeys.positions(),
    queryFn: listSettingsPositions,
  });
