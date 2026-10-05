// Wishlist website toko — snapshot kartu produk di localStorage (tanpa backend).

export const WISHLIST_STORAGE_KEY = "paddy-store-wishlist";
export const MAX_WISHLIST = 100;

export type WishlistItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  categoryName: string | null;
};

export function parseWishlist(raw: string | null | undefined): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: WishlistItem[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.slug !== "string" || typeof r.name !== "string") continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : null,
        price: Number(r.price) || 0,
        compareAtPrice: r.compareAtPrice != null && Number.isFinite(Number(r.compareAtPrice)) ? Number(r.compareAtPrice) : null,
        categoryName: typeof r.categoryName === "string" ? r.categoryName : null,
      });
    }
    return out.slice(0, MAX_WISHLIST);
  } catch {
    return [];
  }
}

/** Tambah bila belum ada (di depan), hapus bila sudah ada. */
export function toggleWishlist(items: WishlistItem[], item: WishlistItem): WishlistItem[] {
  if (items.some((row) => row.id === item.id)) return items.filter((row) => row.id !== item.id);
  return [item, ...items].slice(0, MAX_WISHLIST);
}

export function inWishlist(items: WishlistItem[], id: string): boolean {
  return items.some((row) => row.id === id);
}
