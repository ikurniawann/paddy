export const businessQueryKeys = {
  all: ["settings", "business"] as const,
  tree: () => [...businessQueryKeys.all, "tree"] as const,
};
