// Website toko publik — pembentuk tautan internal.
//
// Di host utama halaman toko ada di /store/…; di host toko (mis.
// shop-paddy.reddie.id) src/proxy.ts me-rewrite /x → /store/x dan mengirim
// header `x-store-base: ""`. Semua tautan dibangun lewat storeHref(base, path)
// supaya tidak pernah menulis "/store" secara langsung.

export type StoreBase = "" | "/store";

export const STORE_BASE_HEADER = "x-store-base";

/** Nilai header x-store-base → base path ("" hanya bila header ada & kosong). */
export function resolveStoreBase(headerValue: string | null | undefined): StoreBase {
  return headerValue === "" ? "" : "/store";
}

/** Gabungkan base dengan path toko ("/shop", "/product/x?y=1"). URL absolut dibiarkan. */
export function storeHref(base: string, path = "/"): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!base) return clean;
  if (clean === "/") return base;
  if (clean.startsWith("/?") || clean.startsWith("/#")) return `${base}${clean.slice(1)}`;
  return `${base}${clean}`;
}

export type ListingParams = {
  q?: string | null;
  sort?: string | null;
  min?: number | string | null;
  max?: number | string | null;
  page?: number | string | null;
};

/** Query string listing; nilai kosong & default (sort=newest, page=1) dibuang. */
export function listingQuery(params: ListingParams): string {
  const search = new URLSearchParams();
  const q = (params.q ?? "").toString().trim();
  if (q) search.set("q", q);
  if (params.sort && params.sort !== "newest") search.set("sort", String(params.sort));
  for (const key of ["min", "max"] as const) {
    const value = params[key];
    if (value === null || value === undefined || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0) search.set(key, String(Math.round(num)));
  }
  const page = Number(params.page ?? 1);
  if (Number.isFinite(page) && page > 1) search.set("page", String(Math.floor(page)));
  const out = search.toString();
  return out ? `?${out}` : "";
}

/** Angka query positif (min/max/page) atau null. */
export function parseQueryNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Tautan WhatsApp (wa.me) dengan pesan opsional; null bila nomor kosong. */
export function whatsappHref(phone: string, message?: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** searchParams halaman listing → state terpakai (q, sort, min, max, page). */
export function parseListingParams(sp: RawSearchParams) {
  const sortRaw = firstParam(sp.sort);
  const sort = sortRaw === "price_asc" || sortRaw === "price_desc" || sortRaw === "name" ? sortRaw : "newest";
  const page = parseQueryNumber(sp.page);
  return {
    q: firstParam(sp.q).trim().slice(0, 80),
    sort: sort as "newest" | "price_asc" | "price_desc" | "name",
    min: parseQueryNumber(sp.min),
    max: parseQueryNumber(sp.max),
    page: page && page >= 1 ? Math.floor(page) : 1,
  };
}
