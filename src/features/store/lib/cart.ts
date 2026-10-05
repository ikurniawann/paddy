// Keranjang website toko — disimpan minimal di localStorage; harga & stok
// selalu disegarkan lewat POST /api/public/store/cart. Fungsi di sini murni
// (tanpa akses window) supaya bisa diuji.

export const CART_STORAGE_KEY = "paddy-store-cart";
export const MAX_LINE_QTY = 99;
export const MAX_CART_LINES = 50;

export type CartItem = { productId: string; skuId: string | null; qty: number };

export function cartLineKey(item: { productId: string; skuId: string | null }): string {
  return `${item.productId}:${item.skuId ?? ""}`;
}

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(Math.max(Math.floor(qty), 1), MAX_LINE_QTY);
}

/** Gabungkan baris dengan produk+varian sama (qty dijumlah, maks 99). */
export function mergeCarts(...lists: CartItem[][]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const list of lists) {
    for (const item of list) {
      const key = cartLineKey(item);
      const existing = map.get(key);
      map.set(key, existing ? { ...existing, qty: clampQty(existing.qty + item.qty) } : { ...item, qty: clampQty(item.qty) });
    }
  }
  return [...map.values()].slice(0, MAX_CART_LINES);
}

/** Isi localStorage → daftar valid (data rusak diabaikan). */
export function parseCart(raw: string | null | undefined): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: CartItem[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const { productId, skuId, qty } = row as Record<string, unknown>;
      if (typeof productId !== "string" || !productId) continue;
      const qtyNum = Number(qty);
      if (!Number.isFinite(qtyNum) || qtyNum < 1) continue;
      items.push({ productId, skuId: typeof skuId === "string" && skuId ? skuId : null, qty: qtyNum });
    }
    return mergeCarts(items);
  } catch {
    return [];
  }
}

export function serializeCart(items: CartItem[]): string {
  return JSON.stringify(items.map(({ productId, skuId, qty }) => ({ productId, skuId, qty })));
}

/** Stok maksimum yang bisa dibeli: kirim (Gudang Pusat) atau salah satu toko. */
export function maxPurchasableQty(line: { shipStock: number; pickupStock: Record<string, number> }): number {
  const pickup = Object.values(line.pickupStock ?? {});
  return Math.max(0, line.shipStock || 0, ...pickup.map((n) => Number(n) || 0));
}

/** Batasi qty ke [1, min(max, 99)]; 0 bila stok habis. max null = tanpa batas stok. */
export function capQty(qty: number, max: number | null): number {
  const limit = max === null ? MAX_LINE_QTY : Math.min(Math.max(0, Math.floor(max)), MAX_LINE_QTY);
  if (limit <= 0) return 0;
  return Math.min(clampQty(qty), limit);
}

export function addToCart(items: CartItem[], item: Omit<CartItem, "qty">, qty: number, max: number | null = null): CartItem[] {
  const key = cartLineKey(item);
  const existing = items.find((line) => cartLineKey(line) === key);
  const nextQty = capQty((existing?.qty ?? 0) + qty, max);
  if (nextQty <= 0) return items;
  if (existing) return items.map((line) => (cartLineKey(line) === key ? { ...line, qty: nextQty } : line));
  return [...items, { productId: item.productId, skuId: item.skuId, qty: nextQty }].slice(0, MAX_CART_LINES);
}

/** Ubah qty baris; qty ≤ 0 menghapus baris. */
export function setCartQty(items: CartItem[], key: string, qty: number): CartItem[] {
  if (qty <= 0) return removeFromCart(items, key);
  return items.map((line) => (cartLineKey(line) === key ? { ...line, qty: clampQty(qty) } : line));
}

export function removeFromCart(items: CartItem[], key: string): CartItem[] {
  return items.filter((line) => cartLineKey(line) !== key);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, line) => sum + line.qty, 0);
}

export type CartStockLine = { productId: string; skuId: string | null; shipStock: number; pickupStock: Record<string, number> };

/**
 * Sesuaikan keranjang dengan snapshot server: baris yang tidak dijual lagi
 * (null) dibuang, qty dipangkas ke stok tersedia. Mengembalikan keranjang baru
 * dan apakah ada perubahan.
 */
export function reconcileCart(
  items: CartItem[],
  snapshot: Array<CartStockLine | null>
): { items: CartItem[]; changed: boolean; removed: number } {
  const next: CartItem[] = [];
  let changed = false;
  let removed = 0;
  items.forEach((item, index) => {
    const line = snapshot[index];
    if (!line) {
      changed = true;
      removed += 1;
      return;
    }
    // Produk tanpa varian & tanpa lokasi stok: server tidak memberi angka stok → jangan dibatasi.
    const tracked = line.skuId !== null;
    const qty = tracked ? capQty(item.qty, maxPurchasableQty(line)) : capQty(item.qty, null);
    if (qty <= 0) {
      // Stok habis: biarkan baris tetap ada (ditandai di UI) tanpa mengubah qty.
      next.push(item);
      return;
    }
    if (qty !== item.qty) changed = true;
    next.push({ ...item, qty });
  });
  return { items: next, changed, removed };
}
