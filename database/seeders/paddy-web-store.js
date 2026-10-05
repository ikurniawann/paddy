#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- seeder Node CommonJS, sama seperti seeder lain */
/**
 * Seeder: website toko publik Paddy (EPIC-054).
 *
 * Mengisi (idempoten):
 *   - shop.storefronts 'toko'            nama & deskripsi toko online
 *   - shop.product_channels (web)        semua produk katalog Paddy tampil di website
 *   - shop.web_listings                  slug URL, harga coret (data paddy.id), new arrival
 *   - shop.web_categories                slug + banner kategori (menu "Products")
 *   - shop.web_collections (+products)   menu "Catalogues" (tema desain) & Best Seller
 *   - shop.flat_shipping_zones           ongkir flat per wilayah (DEMO, sampai kurir realtime aktif)
 *   - shop.pickup_points                 "Ambil di toko" = toko di paddy-business-structure.js
 *   - configuration.app_settings         rekening transfer (DEMO), WhatsApp, pengumuman
 *
 * CATATAN: tema Catalogues (Animal, Foodie, …) DIKURASI manual dari nama desain —
 * data paddy.id tidak memberi tema untuk desain-desain di katalog demo ini.
 * Tarif flat & rekening bank adalah DEMO: ganti sebelum dipakai pembeli sungguhan.
 *
 * Prasyarat: paddy-structure, paddy-catalog.
 *
 * Usage:
 *   node database/seeders/paddy-web-store.js
 *   npm run db:seed:paddy-web-store
 */

const fs = require("fs");
const path = require("path");
const { runSeeder } = require("./lib/paddy-demo");
const { LOCATIONS } = require("./paddy-business-structure");

const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "paddy-catalog.json"), "utf-8"));

/** Kategori katalog → slug URL (mengikuti paddy.id) & banner. */
const CATEGORIES = {
  CASES: { slug: "paddy-cases", banner: "/store/categories/case.webp", sort: 1 },
  CATALOGUE: { slug: "catalogue-case", banner: "/store/categories/case.webp", sort: 2 },
  PODS: { slug: "paddy-pods", banner: "/store/categories/adorable-goods.webp", sort: 3 },
  POPSOCKET: { slug: "paddy-pop-socket", banner: "/store/categories/accessories.webp", sort: 4 },
  ACCESSORIES: { slug: "paddy-accessories", banner: "/store/categories/accessories.webp", sort: 5 },
  BAGS: { slug: "paddy-bags", banner: "/store/categories/bag.webp", sort: 6 },
  WATCHES: { slug: "paddy-watch", banner: "/store/categories/watch.webp", sort: 7 },
  STRAPS: { slug: "strap-paddy-watch", banner: "/store/categories/watch.webp", sort: 8 },
  APPARELS: { slug: "paddy-apparels", banner: "/store/categories/apparel.webp", sort: 9 },
  PARFUME: { slug: "paddy-parfume", banner: "/store/categories/adorable-goods.webp", sort: 10 },
};

/** Menu "Catalogues": tema desain (kurasi) → SKU produk. */
const COLLECTIONS = [
  { slug: "animal", name: "Animal", skus: ["PDY-CT-004", "PDY-CT-005", "PDY-CT-010", "PDY-CT-013", "PDY-CT-014", "PDY-PD-001", "PDY-PD-004"] },
  { slug: "aesthetic", name: "Aesthetic", skus: ["PDY-CT-002", "PDY-CT-009", "PDY-CT-012", "PDY-CT-016"] },
  { slug: "cartoon", name: "Cartoon", skus: ["PDY-CT-003", "PDY-CT-005", "PDY-CT-006", "PDY-CT-007", "PDY-PD-002", "PDY-PS-004", "PDY-PS-006"] },
  { slug: "floral", name: "Floral", skus: ["PDY-PD-002", "PDY-PD-003", "PDY-PD-006"] },
  { slug: "foodie", name: "Foodie", skus: ["PDY-CT-001", "PDY-CT-003", "PDY-CT-004", "PDY-CT-008", "PDY-CT-015", "PDY-PD-005", "PDY-PS-001"] },
  { slug: "quotes", name: "Quotes", skus: ["PDY-CT-015", "PDY-CT-016", "PDY-PS-002"] },
  { slug: "travel", name: "Travel", skus: ["PDY-CT-011", "PDY-PS-001", "PDY-PS-003", "PDY-PS-005"] },
  {
    slug: "collaboration",
    name: "Collaboration",
    skus: ["PDY-CT-001", "PDY-CT-002", "PDY-CT-010", "PDY-CT-011", "PDY-CT-012", "PDY-CT-013", "PDY-CT-014", "PDY-BG-006"],
  },
  {
    slug: "best-seller",
    name: "Best Seller",
    nav: "featured",
    skus: ["PDY-CS-001", "PDY-WT-002", "PDY-AC-001", "PDY-AC-002", "PDY-BG-004", "PDY-CT-001", "PDY-PD-002", "PDY-WT-004", "PDY-BG-005", "PDY-PF-001"],
  },
];

/** Produk "New Arrivals" di beranda. */
const NEW_ARRIVALS = ["PDY-CT-015", "PDY-CT-016", "PDY-CT-008", "PDY-CT-006", "PDY-WT-001", "PDY-AP-002", "PDY-BG-006", "PDY-PF-001"];

/** Harga coret demo untuk case katalog (paddy.id: Rp100.000 → Rp39.000 saat promo). */
const CATALOGUE_COMPARE_AT = 129000;

/** Ongkir flat per wilayah — DEMO (tarif & estimasi asumsi; ganti sesuai kontrak kurir). */
const FLAT_ZONES = [
  ["JABAR", "Jawa Barat", ["Jawa Barat"], 15000, "1–2 hari", 1],
  ["JAKARTA-BANTEN", "DKI Jakarta & Banten", ["DKI Jakarta", "Banten"], 18000, "1–3 hari", 2],
  ["JATENG-JATIM", "Jawa Tengah, DIY & Jawa Timur", ["Jawa Tengah", "DI Yogyakarta", "Jawa Timur"], 22000, "2–4 hari", 3],
  ["BALI-NUSRA", "Bali & Nusa Tenggara", ["Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur"], 32000, "3–5 hari", 4],
  [
    "SUMATERA",
    "Sumatera",
    ["Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Bengkulu", "Sumatera Selatan", "Kepulauan Bangka Belitung", "Lampung"],
    35000,
    "3–6 hari",
    5,
  ],
  [
    "KALIMANTAN-SULAWESI",
    "Kalimantan & Sulawesi",
    [
      "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
      "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara",
    ],
    45000,
    "4–7 hari",
    6,
  ],
  ["LAINNYA", "Maluku & Papua", [], 65000, "5–10 hari", 7],
];

/** Jam buka toko untuk "Ambil di toko". */
const PICKUP_HOURS = {
  "PADDY-BDG-GANDAPURA": "Setiap hari 09.00–21.00",
  "PADDY-BDG-PVJ": "Setiap hari 10.00–22.00 (jam mall)",
  "PADDY-JKT-BLOKM": "Setiap hari 09.00–21.00",
  "PADDY-JKT-LMN": "Setiap hari 10.00–22.00 (jam mall)",
};

const SETTINGS = {
  shop_announcement: "Hello, Paddy Besties! Welcome to Paddy's Official Website",
  // DEMO — nomor rekening belum diisi; website menampilkan peringatan sampai diganti.
  shop_bank_accounts: JSON.stringify([
    { bank: "BCA", number: "", holder: "CV Cipta Kreasi Kreatif", note: "DEMO — isi nomor rekening Paddy" },
  ]),
  // Kosong = tombol WhatsApp disembunyikan. Format 62xxxxxxxxxx.
  shop_whatsapp: "",
  shop_instagram: "https://www.instagram.com/paddy.id/",
};

function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

runSeeder("Seeding website toko Paddy", async (c) => {
  // ── Storefront ───────────────────────────────────────────────────────────
  // Indeks unik storefront memakai lower(slug) → update dulu, insert bila belum ada.
  const { rowCount: storefrontUpdated } = await c.query(
    `UPDATE shop.storefronts SET name = 'Paddy Official Store',
       description = 'Customized Phone Cases & Adorable Goods', is_active = true, updated_at = NOW()
     WHERE lower(slug) = 'toko'`
  );
  if (!storefrontUpdated) {
    await c.query(
      `INSERT INTO shop.storefronts (slug, name, description, is_active)
       VALUES ('toko', 'Paddy Official Store', 'Customized Phone Cases & Adorable Goods', true)`
    );
  }

  // ── Produk: kanal web + listing ──────────────────────────────────────────
  const { rows: posRows } = await c.query(
    `SELECT id, sku, name FROM pos.pos_products WHERE sku = ANY($1::text[])`,
    [CATALOG.products.map((p) => p.sku)]
  );
  const posBySku = new Map(posRows.map((r) => [r.sku, r]));
  const usedSlugs = new Set();
  let listed = 0;
  for (const [i, p] of CATALOG.products.entries()) {
    const pos = posBySku.get(p.sku);
    if (!pos) continue;
    let slug = slugify(p.name) || slugify(p.sku);
    if (usedSlugs.has(slug)) slug = `${slug}-${slugify(p.sku)}`;
    usedSlugs.add(slug);
    const compareAt =
      p.compare_at_price ?? (p.category === "CATALOGUE" ? CATALOGUE_COMPARE_AT : null);

    await c.query(
      `INSERT INTO shop.product_channels (product_id, channel_code, is_distributed)
       VALUES ($1, 'web', true)
       ON CONFLICT (product_id, channel_code) DO UPDATE SET is_distributed = true, updated_at = NOW()`,
      [pos.id]
    );
    await c.query(
      `INSERT INTO shop.web_listings (product_id, slug, compare_at_price, is_new_arrival, sort_order, published_at)
       VALUES ($1, $2, $3, $4, $5::int, NOW() - make_interval(mins => $5::int))
       ON CONFLICT (product_id) DO UPDATE SET slug = EXCLUDED.slug, compare_at_price = EXCLUDED.compare_at_price,
         is_new_arrival = EXCLUDED.is_new_arrival, sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
      [pos.id, slug, compareAt, NEW_ARRIVALS.includes(p.sku), i]
    );
    listed += 1;
  }
  console.log(`  ✓ produk tampil di website: ${listed}`);

  // ── Kategori ──────────────────────────────────────────────────────────────
  for (const cat of CATALOG.categories) {
    const meta = CATEGORIES[cat.code];
    if (!meta) continue;
    const { rows } = await c.query(`SELECT id FROM pos.pos_categories WHERE lower(name) = lower($1) LIMIT 1`, [cat.name]);
    if (!rows[0]) continue;
    await c.query(
      `INSERT INTO shop.web_categories (pos_category_id, slug, title, description, banner_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (pos_category_id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title,
         description = EXCLUDED.description, banner_url = EXCLUDED.banner_url, sort_order = EXCLUDED.sort_order,
         is_active = true, updated_at = NOW()`,
      [rows[0].id, meta.slug, cat.name, cat.description, meta.banner, meta.sort]
    );
  }
  console.log(`  ✓ kategori web: ${Object.keys(CATEGORIES).length}`);

  // ── Koleksi ───────────────────────────────────────────────────────────────
  for (const [i, col] of COLLECTIONS.entries()) {
    const { rows } = await c.query(
      `INSERT INTO shop.web_collections (slug, name, nav_group, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, nav_group = EXCLUDED.nav_group,
         sort_order = EXCLUDED.sort_order, is_active = true, updated_at = NOW()
       RETURNING id`,
      [col.slug, col.name, col.nav ?? "catalogues", i + 1]
    );
    const collectionId = rows[0].id;
    await c.query(`DELETE FROM shop.web_collection_products WHERE collection_id = $1`, [collectionId]);
    for (const [j, sku] of col.skus.entries()) {
      const pos = posBySku.get(sku);
      if (!pos) continue;
      await c.query(
        `INSERT INTO shop.web_collection_products (collection_id, product_id, sort_order) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [collectionId, pos.id, j]
      );
    }
  }
  console.log(`  ✓ koleksi: ${COLLECTIONS.map((col) => col.name).join(", ")}`);

  // ── Ongkir flat ───────────────────────────────────────────────────────────
  for (const [code, name, provinces, price, eta, sort] of FLAT_ZONES) {
    await c.query(
      `INSERT INTO shop.flat_shipping_zones (code, name, provinces, price, eta_label, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, provinces = EXCLUDED.provinces, price = EXCLUDED.price,
         eta_label = EXCLUDED.eta_label, sort_order = EXCLUDED.sort_order, is_active = true, updated_at = NOW()`,
      [code, name, provinces, price, eta, sort]
    );
  }
  console.log(`  ✓ zona ongkir flat: ${FLAT_ZONES.length} (DEMO)`);

  // ── Ambil di toko ─────────────────────────────────────────────────────────
  let pickups = 0;
  for (const [i, loc] of LOCATIONS.entries()) {
    if (loc.kind === "hq") continue;
    const { rows } = await c.query(
      `SELECT w.id FROM configuration.warehouses w JOIN configuration.branches b ON b.id = w.branch_id
       WHERE b.code = $1 AND w.code = $2 LIMIT 1`,
      [loc.code, loc.stalls[0].code]
    );
    if (!rows[0]) continue;
    await c.query(
      `INSERT INTO shop.pickup_points (warehouse_id, name, address, city, opening_hours, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (warehouse_id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
         opening_hours = EXCLUDED.opening_hours, sort_order = EXCLUDED.sort_order, is_active = true, updated_at = NOW()`,
      [rows[0].id, loc.name, loc.address, loc.city, PICKUP_HOURS[loc.code] ?? loc.hours ?? null, i]
    );
    pickups += 1;
  }
  console.log(`  ✓ titik ambil di toko: ${pickups}`);

  // ── Pengaturan toko ───────────────────────────────────────────────────────
  for (const [key, value] of Object.entries(SETTINGS)) {
    // Nilai yang sudah diubah admin tidak ditimpa (kecuali pengumuman default).
    await c.query(
      `INSERT INTO configuration.app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }
  console.log("  ✓ pengaturan toko (rekening DEMO, WhatsApp kosong, pengumuman)");

  return { produk: listed, kategori: Object.keys(CATEGORIES).length, koleksi: COLLECTIONS.length, "zona flat": FLAT_ZONES.length, "ambil di toko": pickups };
});
