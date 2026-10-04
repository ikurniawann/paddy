export const productsQueryKeys = {
  all: ["pos", "products"] as const,
  catalog: () => ["pos", "products", "catalog"] as const,
};
