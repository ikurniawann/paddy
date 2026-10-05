// Website toko publik (EPIC-054) — tipe & helper murni (aman di client & server).

export type StoreNavItem = { slug: string; name: string };

export type StoreNav = {
  /** Menu "Products" — kategori produk. */
  categories: StoreNavItem[];
  /** Menu "Catalogues" — tema desain & kolaborasi. */
  catalogues: StoreNavItem[];
};

export type StoreProductCard = {
  id: string;
  slug: string;
  name: string;
  categoryName: string | null;
  categorySlug: string | null;
  imageUrl: string | null;
  /** Harga termurah yang bisa dibeli (varian dengan harga sendiri bisa lebih mahal). */
  price: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  /** Ada stok untuk dikirim (Gudang Pusat) atau diambil di salah satu toko. */
  inStock: boolean;
  hasVariants: boolean;
};

export type StoreVariant = {
  id: string;
  sku: string;
  name: string;
  options: Record<string, string>;
  price: number;
  /** Stok untuk pengiriman (lokasi pemenuhan online = Gudang Pusat). */
  shipStock: number;
  /** Stok per toko pengambilan: warehouse_id → qty. */
  pickupStock: Record<string, number>;
};

export type StoreOptionAxis = { name: string; values: string[] };

export type StoreProductDetail = StoreProductCard & {
  description: string | null;
  longDescription: string | null;
  images: string[];
  weightGram: number;
  variants: StoreVariant[];
  optionAxes: StoreOptionAxis[];
  collections: StoreNavItem[];
};

export type StoreSort = "newest" | "price_asc" | "price_desc" | "name";

export type StoreListQuery = {
  categorySlug?: string | null;
  collectionSlug?: string | null;
  q?: string | null;
  sort?: StoreSort;
  minPrice?: number | null;
  maxPrice?: number | null;
  page?: number;
  perPage?: number;
};

export type StoreListResult = {
  items: StoreProductCard[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  /** Rentang harga seluruh hasil (untuk slider filter harga). */
  priceRange: { min: number; max: number };
};

export type StorePickupPoint = {
  warehouseId: string;
  name: string;
  address: string;
  city: string;
  openingHours: string | null;
};

export type StoreFlatZone = {
  code: string;
  name: string;
  provinces: string[];
  price: number;
  etaLabel: string | null;
};

export type StoreBankAccount = { bank: string; number: string; holder: string; note?: string };

export type StoreSettings = {
  announcement: string;
  whatsapp: string;
  instagram: string;
  bankAccounts: StoreBankAccount[];
  /** true bila kunci Xendit ada → pembayaran online; false → transfer manual. */
  onlinePayment: boolean;
};

export type StoreShippingMethod = "pickup" | "flat" | "courier";

/** 38 provinsi Indonesia (pilihan alamat & pencocokan zona ongkir flat). */
export const INDONESIA_PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Bengkulu",
  "Sumatera Selatan", "Kepulauan Bangka Belitung", "Lampung", "DKI Jakarta", "Banten", "Jawa Barat",
  "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan",
  "Sulawesi Tenggara", "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Barat Daya",
  "Papua Selatan", "Papua Tengah", "Papua Pegunungan",
] as const;

/** Diskon bulat (%) dari harga coret; null bila tidak ada diskon. */
export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price || price < 0) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Sumbu pilihan varian (mis. Warna, Tipe HP) dengan urutan nilai seperti data. */
export function buildOptionAxes(variants: Array<{ options: Record<string, string> }>): StoreOptionAxis[] {
  const axes = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.options ?? {})) {
      const values = axes.get(name) ?? [];
      if (!values.includes(value)) values.push(value);
      axes.set(name, values);
    }
  }
  return [...axes.entries()].map(([name, values]) => ({ name, values }));
}

/** Varian yang cocok dengan pilihan lengkap pada semua sumbu. */
export function findVariant<T extends { options: Record<string, string> }>(
  variants: T[],
  selection: Record<string, string>
): T | null {
  return (
    variants.find((variant) =>
      Object.entries(variant.options ?? {}).every(([name, value]) => selection[name] === value)
    ) ?? null
  );
}

/** Zona ongkir flat untuk provinsi; zona tanpa daftar provinsi = zona sisa. */
export function matchFlatZone(province: string, zones: StoreFlatZone[]): StoreFlatZone | null {
  const target = province.trim().toLowerCase();
  if (!target) return null;
  return (
    zones.find((zone) => zone.provinces.some((p) => p.toLowerCase() === target)) ??
    zones.find((zone) => zone.provinces.length === 0) ??
    null
  );
}

export function normalizeStoreSort(value: unknown): StoreSort {
  return value === "price_asc" || value === "price_desc" || value === "name" ? value : "newest";
}

/** Nomor WhatsApp Indonesia → format 62xxxxxxxxxx (null bila tidak valid). */
export function normalizeIndonesianPhone(raw: string): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("0")) normalized = `62${normalized.slice(1)}`;
  else if (normalized.startsWith("8")) normalized = `62${normalized}`;
  if (!/^628\d{7,12}$/.test(normalized)) return null;
  return normalized;
}
