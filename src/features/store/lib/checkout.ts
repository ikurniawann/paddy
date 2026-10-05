// Helper murni checkout website toko: ketersediaan stok per metode & total.

export type CheckoutStockLine = {
  skuId: string | null;
  qty: number;
  shipStock: number;
  pickupStock: Record<string, number>;
};

/** Stok baris untuk metode terpilih; null = tidak dilacak (produk tanpa varian). */
export function lineStockFor(line: CheckoutStockLine, method: "flat" | "pickup", warehouseId?: string | null): number | null {
  if (line.skuId === null) return null;
  if (method === "flat") return line.shipStock;
  if (!warehouseId) return null;
  return line.pickupStock[warehouseId] ?? 0;
}

export function lineFulfillable(line: CheckoutStockLine, method: "flat" | "pickup", warehouseId?: string | null): boolean {
  const stock = lineStockFor(line, method, warehouseId);
  return stock === null || stock >= line.qty;
}

/** Semua baris bisa dipenuhi oleh metode/toko ini. */
export function cartFulfillable(lines: CheckoutStockLine[], method: "flat" | "pickup", warehouseId?: string | null): boolean {
  return lines.length > 0 && lines.every((line) => lineFulfillable(line, method, warehouseId));
}

export function cartSubtotal(lines: Array<{ price: number; qty: number }>): number {
  return lines.reduce((sum, line) => sum + line.price * line.qty, 0);
}
