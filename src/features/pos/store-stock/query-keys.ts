export const storeStockQueryKeys = {
  all: ["pos", "store-stock"] as const,
  list: (search: string) => [...storeStockQueryKeys.all, "list", { search }] as const,
  movements: (skuId: string, warehouseId: string) =>
    [...storeStockQueryKeys.all, "movements", { skuId, warehouseId }] as const,
};
