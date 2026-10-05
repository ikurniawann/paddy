import { headers } from "next/headers";
import { cache } from "react";
import type { Metadata } from "next";
import { getStoreNav, getStoreSettings } from "@/lib/store/catalog-server";
import { resolveStoreBase, STORE_BASE_HEADER, storeHref, type StoreBase } from "@/features/store/lib/href";

export const STORE_NAME = "Paddy Official Store";
export const STORE_DEFAULT_DESCRIPTION =
  "Paddy — brand lokal dari Bandung sejak 2017. Custom phone case dengan UV printing teknologi Jepang, tas, smartwatch, aksesoris, dan apparel.";

/** Base path tautan toko untuk request ini ("" di host toko, "/store" di host utama). */
export async function getStoreBase(): Promise<StoreBase> {
  const h = await headers();
  return resolveStoreBase(h.get(STORE_BASE_HEADER));
}

/** Origin publik request (untuk metadataBase / URL OpenGraph absolut). */
export async function getRequestOrigin(): Promise<string> {
  const configured = (process.env.STORE_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (h.get(STORE_BASE_HEADER) === "" && configured) return configured;
  if (!host) return configured || "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Data bersama layout & halaman (di-dedupe per request). */
export const loadStoreChrome = cache(async () => {
  const [nav, settings] = await Promise.all([getStoreNav(), getStoreSettings()]);
  return { nav, settings };
});

/** Metadata halaman: judul, deskripsi, canonical & OpenGraph. */
export async function storeMetadata(input: {
  title?: string;
  description?: string | null;
  path: string;
  image?: string | null;
  noIndex?: boolean;
}): Promise<Metadata> {
  const base = await getStoreBase();
  const description = (input.description || STORE_DEFAULT_DESCRIPTION).replace(/\s+/g, " ").trim().slice(0, 300);
  const url = storeHref(base, input.path);
  const fullTitle = input.title ? `${input.title} | ${STORE_NAME}` : STORE_NAME;
  return {
    title: input.title ?? { absolute: `${STORE_NAME} — Customized Phone Cases & Adorable Goods` },
    description,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: STORE_NAME,
      locale: "id_ID",
      title: fullTitle,
      description,
      url,
      images: [{ url: input.image || "/store/banners/welcome.webp" }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}
