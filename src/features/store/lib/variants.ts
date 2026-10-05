// Helper murni pemilihan varian di halaman produk.
import type { StorePickupPoint, StoreVariant } from "@/lib/store/types";

/** Label sumbu: "Tipe HP" ditampilkan sebagai "Merk HP" (seperti paddy.id). */
export function axisLabel(name: string): string {
  return name.trim().toLowerCase() === "tipe hp" ? "Merk HP" : name;
}

/** Varian yang cocok dengan pilihan parsial (sumbu yang belum dipilih diabaikan). */
export function variantsMatching<T extends { options: Record<string, string> }>(
  variants: T[],
  selection: Record<string, string>
): T[] {
  return variants.filter((variant) =>
    Object.entries(selection).every(([axis, value]) => !value || variant.options?.[axis] === value)
  );
}

export function variantTotalStock(variant: Pick<StoreVariant, "shipStock" | "pickupStock">): number {
  return Math.max(variant.shipStock, ...Object.values(variant.pickupStock), 0);
}

/**
 * Status nilai sebuah sumbu terhadap pilihan sumbu lain:
 * "none" = tidak ada kombinasi, "soldout" = ada tapi stok habis, "ok".
 */
export function optionValueState(
  variants: StoreVariant[],
  selection: Record<string, string>,
  axis: string,
  value: string
): "ok" | "soldout" | "none" {
  const others = { ...selection, [axis]: value };
  const matches = variantsMatching(variants, others);
  if (matches.length === 0) return "none";
  return matches.some((variant) => variantTotalStock(variant) > 0) ? "ok" : "soldout";
}

/** Nama pendek toko untuk baris stok ("Paddy Playstore Gandapura" → "Gandapura"). */
export function shortPickupName(name: string): string {
  const short = name.replace(/^paddy\s+(playstore|store)\s+/i, "").trim();
  return short || name;
}

export function pickupStockSummary(variant: Pick<StoreVariant, "pickupStock">, points: StorePickupPoint[]): string {
  return points
    .map((point) => `${shortPickupName(point.name)} (${variant.pickupStock[point.warehouseId] ?? 0})`)
    .join(", ");
}

const UV_PARAGRAPH =
  "Kreasikan casing handphone kamu bersama Paddy Case! Desain dicetak dengan teknik UV printing teknologi Jepang — hasil gambar tajam, anti gores, dan tidak mudah kuning.";

/** Paragraf deskripsi produk: description + longDescription tanpa duplikasi; produk case diberi info UV printing. */
export function buildDescription(product: {
  description: string | null;
  longDescription: string | null;
  categorySlug: string | null;
  name: string;
}): string[] {
  const desc = (product.description ?? "").trim();
  const long = (product.longDescription ?? "").trim();
  const chunks: string[] = [];
  if (long && desc && long.includes(desc)) chunks.push(long);
  else {
    if (desc) chunks.push(desc);
    if (long) chunks.push(long);
  }
  const paragraphs = chunks
    .flatMap((chunk) => chunk.split(/\n\s*\n|\r?\n/))
    .map((p) => p.trim())
    .filter(Boolean);
  const isCase = /case/i.test(product.categorySlug ?? "") || /\bcase\b/i.test(product.name);
  if (isCase && !paragraphs.some((p) => /uv/i.test(p) && /jepang/i.test(p))) paragraphs.push(UV_PARAGRAPH);
  return paragraphs;
}
