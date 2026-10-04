export const settingsQueryKeys = {
  all: ["configuration", "settings"] as const,
  brands: () => [...settingsQueryKeys.all, "brands"] as const,
  positions: () => [...settingsQueryKeys.all, "positions"] as const,
};
