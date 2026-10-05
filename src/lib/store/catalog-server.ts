// Website toko publik (EPIC-054) — query katalog untuk halaman server-rendered.
//
// Produk tampil bila: merchandise aktif & tersedia, didistribusikan ke kanal
// web (shop.product_channels 'web'), dan punya listing (shop.web_listings).
// Harga = harga kanal web ?? harga dasar; varian boleh punya harga sendiri.
// Stok kirim = lokasi pemenuhan online (lokasi utama produk = Gudang Pusat);
// stok ambil = stok toko di shop.pickup_points (multi-toko, EPIC-052).

import { query, queryOne } from "@/lib/db";
import { isXenditConfigured } from "@/lib/xendit/client";
import {
  buildOptionAxes,
  discountPercent,
  type StoreBankAccount,
  type StoreFlatZone,
  type StoreListQuery,
  type StoreListResult,
  type StoreNav,
  type StoreNavItem,
  type StorePickupPoint,
  type StoreProductCard,
  type StoreProductDetail,
  type StoreSettings,
  type StoreVariant,
} from "@/lib/store/types";

const PRODUCT_BASE = `
  SELECT pp.id, wl.slug, pp.name, pp.description, pp.long_description, pp.image_url,
         COALESCE(pc.price_override, pp.base_price, 0)::numeric AS price,
         wl.compare_at_price, wl.is_new_arrival, wl.published_at, wl.sort_order,
         c.name AS category_name, wc.slug AS category_slug, c.display_order AS category_order,
         COALESCE(pp.weight_gram, 0) AS weight_gram,
         (SELECT MIN(COALESCE(s.price_override, pc.price_override, pp.base_price, 0))
          FROM pos.pos_product_skus s WHERE s.product_id = pp.id AND s.is_active) AS min_variant_price,
         EXISTS (SELECT 1 FROM pos.pos_product_skus s WHERE s.product_id = pp.id AND s.is_active) AS has_variants,
         (
           EXISTS (
             SELECT 1 FROM pos.pos_product_skus s
             JOIN pos.pos_sku_stock_locations l ON l.sku_id = s.id
             WHERE s.product_id = pp.id AND s.is_active AND l.stock_quantity > 0
               AND (l.warehouse_id = pos.pos_product_home_warehouse(pp.id)
                    OR l.warehouse_id IN (SELECT warehouse_id FROM shop.pickup_points WHERE is_active))
           )
           OR EXISTS (
             SELECT 1 FROM pos.pos_product_skus s
             WHERE s.product_id = pp.id AND s.is_active AND COALESCE(s.stock_quantity, 0) > 0
               AND NOT EXISTS (SELECT 1 FROM pos.pos_sku_stock_locations l WHERE l.sku_id = s.id)
           )
           OR (
             NOT EXISTS (SELECT 1 FROM pos.pos_product_skus s WHERE s.product_id = pp.id AND s.is_active)
             AND (COALESCE(pp.inventory_tracking, false) = false OR COALESCE(pp.inventory_quantity, 0) > 0)
           )
         ) AS in_stock
  FROM pos.pos_products pp
  JOIN shop.product_channels pc ON pc.product_id = pp.id AND pc.channel_code = 'web' AND pc.is_distributed
  JOIN shop.web_listings wl ON wl.product_id = pp.id
  LEFT JOIN pos.pos_categories c ON c.id = pp.category_id
  LEFT JOIN shop.web_categories wc ON wc.pos_category_id = pp.category_id AND wc.is_active
  WHERE pp.product_kind = 'merchandise' AND pp.is_active AND pp.is_available`;

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  long_description: string | null;
  image_url: string | null;
  price: string;
  compare_at_price: string | null;
  is_new_arrival: boolean;
  published_at: string;
  category_name: string | null;
  category_slug: string | null;
  weight_gram: string;
  min_variant_price: string | null;
  has_variants: boolean;
  in_stock: boolean;
};

function toCard(row: ProductRow): StoreProductCard {
  const base = Number(row.price) || 0;
  const price = row.min_variant_price != null ? Math.min(base, Number(row.min_variant_price)) : base;
  const compareAt = row.compare_at_price != null ? Number(row.compare_at_price) : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    imageUrl: row.image_url,
    price,
    compareAtPrice: compareAt && compareAt > price ? compareAt : null,
    discountPercent: discountPercent(price, compareAt),
    inStock: row.in_stock,
    hasVariants: row.has_variants,
  };
}

const SORT_SQL: Record<string, string> = {
  newest: "published_at DESC, sort_order",
  price_asc: "effective_price ASC, name",
  price_desc: "effective_price DESC, name",
  name: "name ASC",
};

/** Menu header: kategori (Products) & tema (Catalogues). */
export async function getStoreNav(): Promise<StoreNav> {
  const [categories, catalogues] = await Promise.all([
    query<StoreNavItem>(
      `SELECT wc.slug, COALESCE(wc.title, c.name) AS name
       FROM shop.web_categories wc JOIN pos.pos_categories c ON c.id = wc.pos_category_id
       WHERE wc.is_active AND c.is_active ORDER BY wc.sort_order, name`
    ),
    query<StoreNavItem>(
      `SELECT slug, name FROM shop.web_collections
       WHERE is_active AND nav_group = 'catalogues' ORDER BY sort_order, name`
    ),
  ]);
  return { categories, catalogues };
}

export async function getStoreCategory(slug: string) {
  return queryOne<{ slug: string; name: string; description: string | null; banner_url: string | null }>(
    `SELECT wc.slug, COALESCE(wc.title, c.name) AS name, COALESCE(wc.description, '') AS description, wc.banner_url
     FROM shop.web_categories wc JOIN pos.pos_categories c ON c.id = wc.pos_category_id
     WHERE wc.slug = $1 AND wc.is_active`,
    [slug]
  );
}

export async function getStoreCollection(slug: string) {
  return queryOne<{ slug: string; name: string; description: string | null; banner_url: string | null }>(
    `SELECT slug, name, description, banner_url FROM shop.web_collections WHERE slug = $1 AND is_active`,
    [slug]
  );
}

/** Daftar produk dengan filter kategori/koleksi/pencarian/harga, urutan, dan halaman. */
export async function listStoreProducts(input: StoreListQuery = {}): Promise<StoreListResult> {
  const perPage = Math.min(Math.max(Math.floor(input.perPage ?? 12), 1), 60);
  const page = Math.max(Math.floor(input.page ?? 1), 1);
  const params: unknown[] = [];
  const where: string[] = [];
  if (input.categorySlug) {
    params.push(input.categorySlug);
    where.push(`category_slug = $${params.length}`);
  }
  if (input.collectionSlug) {
    params.push(input.collectionSlug);
    where.push(`id IN (SELECT cp.product_id FROM shop.web_collection_products cp
                       JOIN shop.web_collections col ON col.id = cp.collection_id
                       WHERE col.slug = $${params.length} AND col.is_active)`);
  }
  if (input.q?.trim()) {
    params.push(`%${input.q.trim().slice(0, 80)}%`);
    where.push(`(name ILIKE $${params.length} OR COALESCE(category_name, '') ILIKE $${params.length})`);
  }
  const filtered = `
    WITH base AS (${PRODUCT_BASE}),
    priced AS (
      SELECT base.*, LEAST(price, COALESCE(min_variant_price, price)) AS effective_price FROM base
    ),
    scoped AS (SELECT * FROM priced ${where.length ? `WHERE ${where.join(" AND ")}` : ""})`;

  const rangeRow = await queryOne<{ min: string | null; max: string | null }>(
    `${filtered} SELECT MIN(effective_price) AS min, MAX(effective_price) AS max FROM scoped`,
    params
  );

  const priceParams = [...params];
  const priceWhere: string[] = [];
  if (input.minPrice != null && Number.isFinite(input.minPrice)) {
    priceParams.push(input.minPrice);
    priceWhere.push(`effective_price >= $${priceParams.length}`);
  }
  if (input.maxPrice != null && Number.isFinite(input.maxPrice)) {
    priceParams.push(input.maxPrice);
    priceWhere.push(`effective_price <= $${priceParams.length}`);
  }
  priceParams.push(perPage, (page - 1) * perPage);
  const rows = await query<ProductRow & { total: string }>(
    `${filtered}
     SELECT scoped.*, COUNT(*) OVER () AS total FROM scoped
     ${priceWhere.length ? `WHERE ${priceWhere.join(" AND ")}` : ""}
     ORDER BY ${SORT_SQL[input.sort ?? "newest"] ?? SORT_SQL.newest}
     LIMIT $${priceParams.length - 1} OFFSET $${priceParams.length}`,
    priceParams
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  return {
    items: rows.map(toCard),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    priceRange: { min: Number(rangeRow?.min ?? 0), max: Number(rangeRow?.max ?? 0) },
  };
}

export async function listPickupPoints(): Promise<StorePickupPoint[]> {
  return query<StorePickupPoint>(
    `SELECT warehouse_id AS "warehouseId", name, address, city, opening_hours AS "openingHours"
     FROM shop.pickup_points WHERE is_active ORDER BY sort_order, name`
  );
}

async function loadVariants(productId: string, basePrice: number): Promise<StoreVariant[]> {
  const rows = await query<{
    id: string;
    sku: string;
    name: string;
    options: Record<string, string> | null;
    price_override: string | null;
    stock_quantity: string | null;
    has_locations: boolean;
    home_stock: string | null;
    pickup: Array<{ warehouse_id: string; qty: string | number }> | null;
  }>(
    `SELECT s.id, s.sku, s.name, s.options, s.price_override, s.stock_quantity,
            EXISTS (SELECT 1 FROM pos.pos_sku_stock_locations l WHERE l.sku_id = s.id) AS has_locations,
            (SELECT l.stock_quantity FROM pos.pos_sku_stock_locations l
             WHERE l.sku_id = s.id AND l.warehouse_id = pos.pos_product_home_warehouse(s.product_id)) AS home_stock,
            (SELECT json_agg(json_build_object('warehouse_id', pt.warehouse_id, 'qty', COALESCE(l.stock_quantity, 0)))
             FROM shop.pickup_points pt
             LEFT JOIN pos.pos_sku_stock_locations l ON l.sku_id = s.id AND l.warehouse_id = pt.warehouse_id
             WHERE pt.is_active) AS pickup
     FROM pos.pos_product_skus s
     WHERE s.product_id = $1 AND s.is_active
     ORDER BY s.sku`,
    [productId]
  );
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    options: row.options ?? {},
    price: row.price_override != null ? Number(row.price_override) : basePrice,
    shipStock: Math.max(0, Number(row.has_locations ? row.home_stock : row.stock_quantity) || 0),
    pickupStock: row.has_locations
      ? Object.fromEntries((row.pickup ?? []).map((p) => [p.warehouse_id, Math.max(0, Number(p.qty) || 0)]))
      : {},
  }));
}

/** Detail produk berdasarkan slug URL (null = tidak ada / tidak tayang). */
export async function getStoreProduct(slug: string): Promise<StoreProductDetail | null> {
  const row = await queryOne<ProductRow>(`SELECT * FROM (${PRODUCT_BASE}) base WHERE slug = $1`, [slug]);
  if (!row) return null;
  const card = toCard(row);
  const basePrice = Number(row.price) || 0;
  const [variants, images, collections] = await Promise.all([
    loadVariants(row.id, basePrice),
    query<{ url: string }>(
      `SELECT url FROM pos.pos_product_images WHERE product_id = $1 ORDER BY display_order, created_at`,
      [row.id]
    ),
    query<StoreNavItem>(
      `SELECT col.slug, col.name FROM shop.web_collection_products cp
       JOIN shop.web_collections col ON col.id = cp.collection_id AND col.is_active
       WHERE cp.product_id = $1 ORDER BY col.sort_order`,
      [row.id]
    ),
  ]);
  const imageUrls = images.map((img) => img.url);
  if (row.image_url && !imageUrls.includes(row.image_url)) imageUrls.unshift(row.image_url);
  return {
    ...card,
    description: row.description,
    longDescription: row.long_description,
    images: imageUrls,
    weightGram: Number(row.weight_gram) || 0,
    variants,
    optionAxes: buildOptionAxes(variants),
    collections,
  };
}

/** Produk terkait: kategori yang sama dulu, lalu koleksi yang sama. */
export async function getRelatedProducts(product: StoreProductDetail, limit = 5): Promise<StoreProductCard[]> {
  const rows = await query<ProductRow>(
    `SELECT * FROM (${PRODUCT_BASE}) base
     WHERE id <> $1 AND (category_slug = $2 OR id IN (
       SELECT cp.product_id FROM shop.web_collection_products cp
       JOIN shop.web_collections col ON col.id = cp.collection_id
       WHERE col.slug = ANY($3::text[])))
     ORDER BY (category_slug = $2) DESC, sort_order
     LIMIT $4`,
    [product.id, product.categorySlug, product.collections.map((c) => c.slug), limit]
  );
  return rows.map(toCard);
}

export type StoreHome = {
  featuredTabs: Array<{ slug: string; name: string; products: StoreProductCard[] }>;
  newArrivals: StoreProductCard[];
  bestSellers: StoreProductCard[];
  categoryTiles: Array<{ slug: string; name: string; bannerUrl: string }>;
};

/** Data beranda: tab Featured per kategori, New Arrivals, Best Seller, tile kategori. */
export async function getStoreHome(): Promise<StoreHome> {
  const rows = await query<ProductRow>(`SELECT * FROM (${PRODUCT_BASE}) base ORDER BY sort_order`);
  const cards = rows.map(toCard);
  const nav = await getStoreNav();
  const featuredTabs = nav.categories
    .map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      products: cards.filter((card) => card.categorySlug === cat.slug).slice(0, 5),
    }))
    .filter((tab) => tab.products.length > 0)
    .slice(0, 6);
  const newArrivals = rows
    .filter((row) => row.is_new_arrival)
    .map(toCard)
    .slice(0, 8);
  const best = await query<{ product_id: string }>(
    `SELECT cp.product_id FROM shop.web_collection_products cp
     JOIN shop.web_collections col ON col.id = cp.collection_id
     WHERE col.slug = 'best-seller' AND col.is_active ORDER BY cp.sort_order`
  );
  const byId = new Map(cards.map((card) => [card.id, card]));
  const bestSellers = best.map((b) => byId.get(b.product_id)).filter((c): c is StoreProductCard => Boolean(c));
  const tiles = await query<{ slug: string; name: string; banner_url: string }>(
    `SELECT DISTINCT ON (wc.banner_url) wc.slug, COALESCE(wc.title, c.name) AS name, wc.banner_url, wc.sort_order
     FROM shop.web_categories wc JOIN pos.pos_categories c ON c.id = wc.pos_category_id
     WHERE wc.is_active AND wc.banner_url IS NOT NULL
     ORDER BY wc.banner_url, wc.sort_order`
  );
  return {
    featuredTabs,
    newArrivals,
    bestSellers,
    categoryTiles: tiles
      .sort((a, b) => Number((a as { sort_order?: number }).sort_order ?? 0) - Number((b as { sort_order?: number }).sort_order ?? 0))
      .slice(0, 6)
      .map((t) => ({ slug: t.slug, name: t.name, bannerUrl: t.banner_url })),
  };
}

export async function listFlatZones(): Promise<StoreFlatZone[]> {
  const rows = await query<{ code: string; name: string; provinces: string[]; price: string; eta_label: string | null }>(
    `SELECT code, name, provinces, price, eta_label FROM shop.flat_shipping_zones WHERE is_active ORDER BY sort_order`
  );
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    provinces: row.provinces ?? [],
    price: Number(row.price) || 0,
    etaLabel: row.eta_label,
  }));
}

function parseBankAccounts(raw: string | null | undefined): StoreBankAccount[] {
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is StoreBankAccount => !!row && typeof row === "object" && typeof (row as StoreBankAccount).bank === "string")
      .map((row) => ({ bank: row.bank, number: String(row.number ?? ""), holder: String(row.holder ?? ""), note: row.note }));
  } catch {
    return [];
  }
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const rows = await query<{ key: string; value: string | null }>(
    `SELECT key, value FROM configuration.app_settings
     WHERE key IN ('shop_announcement', 'shop_bank_accounts', 'shop_whatsapp', 'shop_instagram')`
  );
  const get = (key: string) => rows.find((row) => row.key === key)?.value ?? "";
  return {
    announcement: get("shop_announcement"),
    whatsapp: get("shop_whatsapp").replace(/\D/g, ""),
    instagram: get("shop_instagram"),
    bankAccounts: parseBankAccounts(get("shop_bank_accounts")),
    onlinePayment: isXenditConfigured(),
  };
}

export type StoreCartLine = {
  productId: string;
  skuId: string | null;
  slug: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  shipStock: number;
  pickupStock: Record<string, number>;
  available: boolean;
};

/** Harga & stok terbaru untuk isi keranjang di browser (null = sudah tidak dijual). */
export async function getCartSnapshot(
  items: Array<{ product_id: string; sku_id?: string | null }>
): Promise<Array<StoreCartLine | null>> {
  const productIds = [...new Set(items.map((item) => item.product_id))];
  if (productIds.length === 0) return [];
  const rows = await query<ProductRow>(
    `SELECT * FROM (${PRODUCT_BASE}) base WHERE id = ANY($1::uuid[])`,
    [productIds]
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const variantCache = new Map<string, StoreVariant[]>();
  const out: Array<StoreCartLine | null> = [];
  for (const item of items) {
    const row = byId.get(item.product_id);
    if (!row) {
      out.push(null);
      continue;
    }
    const basePrice = Number(row.price) || 0;
    if (!variantCache.has(row.id)) variantCache.set(row.id, await loadVariants(row.id, basePrice));
    const variants = variantCache.get(row.id) ?? [];
    const variant = item.sku_id ? variants.find((v) => v.id === item.sku_id) : null;
    if (variants.length > 0 && !variant) {
      out.push(null);
      continue;
    }
    const compareAt = row.compare_at_price != null ? Number(row.compare_at_price) : null;
    const price = variant ? variant.price : basePrice;
    out.push({
      productId: row.id,
      skuId: variant?.id ?? null,
      slug: row.slug,
      name: row.name,
      variantName: variant?.name ?? null,
      imageUrl: row.image_url,
      price,
      compareAtPrice: compareAt && compareAt > price ? compareAt : null,
      shipStock: variant ? variant.shipStock : 0,
      pickupStock: variant ? variant.pickupStock : {},
      available: true,
    });
  }
  return out;
}
