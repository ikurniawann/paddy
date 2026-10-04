#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- seeder Node CommonJS, sama seperti seeder lain */
/**
 * Seeder: katalog retail Paddy (paddy.id) — case HP, pods, pop socket,
 * aksesoris, tas, smartwatch, strap, apparel, parfum.
 *
 * Data dari database/seeders/data/paddy-catalog.json, dibangkitkan dari
 * katalog publik paddy.id (WooCommerce Store API) 2026-10-04: nama, harga
 * jual, dan foto = data paddy.id. HPP, stok awal, dan barcode internal
 * (prefiks GS1 in-store 200) = ASUMSI demo.
 *
 * Model retail memakai fitur merchandise POS (EPIC-039):
 *   - item.product_categories + item.products   (katalog, laporan stok, stall)
 *   - pos.pos_categories + pos.pos_products     (kasir & toko online),
 *     product_kind = 'merchandise', inventory_tracking = true,
 *     source_product_id → item.products.id (tanpa tautan POS menolak menjual)
 *   - pos.pos_product_skus                      varian ber-SKU (Warna × Tipe HP /
 *     Tipe AirPods) dengan barcode & stok sendiri. Barcode hanya ada di level
 *     SKU, jadi produk tanpa varian tetap diberi satu SKU "Standar" supaya
 *     bisa di-scan di kasir; stok selalu dipegang SKU.
 *   - pos.pos_inventory_settings                stok tidak boleh minus, ambang stok menipis
 *   - pos.pos_product_images                    foto produk (public/products/paddy)
 *   - inventory.finished_goods_inventory        stok awal per produk (= SUM varian)
 *
 * Idempotent & "replace": upsert per SKU; produk/kategori yang tidak ada di
 * katalog dinonaktifkan (bukan dihapus) supaya transaksi lama tetap utuh.
 *
 * Usage:
 *   node database/seeders/paddy-catalog.js
 *   npm run db:seed:paddy-catalog
 */

const fs = require("fs");
const path = require("path");
const { runSeeder, firstStall } = require("./lib/paddy-demo");

const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "paddy-catalog.json"), "utf-8"));

/** Satuan retail. Satuan khas F&B (cup, porsi, sendok, …) dinonaktifkan. */
const UNITS = [
  ["PCS", "Pieces", "KECIL", "Satuan barang jadi"],
  ["SET", "Set", "KECIL", "Paket/bundle beberapa barang"],
  ["BOX", "Box", "BESAR", "Kemasan box"],
  ["PACK", "Pack", "BESAR", "Kemasan pack"],
  ["LUSIN", "Lusin", "BESAR", "12 pcs — satuan beli grosir"],
  ["CTN", "Karton", "BESAR", "Karton kiriman supplier"],
  ["ROLL", "Roll", "BESAR", "Gulungan (lakban, bubble wrap, label)"],
  ["LBR", "Lembar", "KECIL", "Lembaran (sticker, kertas)"],
  ["ML", "Mililiter", "KECIL", "Volume tinta/cairan"],
  ["BTL", "Botol", "KECIL", "Botol tinta/cairan"],
];
const FNB_UNITS = ["CUP", "PORSI", "SLICE", "TBSP", "TSP", "BUTIR", "GAL", "IKAT", "SACK", "TRAY", "BKS", "SACHET", "OZ"];

const LOW_STOCK_THRESHOLD = 3;

async function upsertUnits(c, companyId) {
  for (const [kode, nama, tipe, deskripsi] of UNITS) {
    const { rows } = await c.query(
      `SELECT id FROM item.units WHERE upper(kode) = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [kode, companyId]
    );
    if (rows[0]) {
      await c.query(
        `UPDATE item.units SET nama = $2, tipe = $3, deskripsi = $4, is_active = true, updated_at = NOW() WHERE id = $1`,
        [rows[0].id, nama, tipe, deskripsi]
      );
    } else {
      await c.query(
        `INSERT INTO item.units (kode, nama, tipe, deskripsi, company_id, is_active) VALUES ($1,$2,$3,$4,$5,true)`,
        [kode, nama, tipe, deskripsi, companyId]
      );
    }
  }
  const off = await c.query(
    `UPDATE item.units SET is_active = false, updated_at = NOW()
     WHERE company_id = $1 AND upper(kode) = ANY($2::text[]) AND is_active`,
    [companyId, FNB_UNITS]
  );
  const { rows } = await c.query(`SELECT id FROM item.units WHERE upper(kode) = 'PCS' AND company_id = $1 LIMIT 1`, [companyId]);
  return { pcsId: rows[0].id, fnbOff: off.rowCount };
}

async function upsertBrand(c) {
  const { rows } = await c.query(`SELECT id FROM item.brands WHERE lower(name) = 'paddy' LIMIT 1`);
  if (rows[0]) {
    await c.query(`UPDATE item.brands SET industry = 'Retail', logo_url = '/logos/paddy-mark.png', is_active = true WHERE id = $1`, [rows[0].id]);
    return rows[0].id;
  }
  const ins = await c.query(
    `INSERT INTO item.brands (name, industry, logo_url, is_active) VALUES ('Paddy', 'Retail', '/logos/paddy-mark.png', true) RETURNING id`
  );
  return ins.rows[0].id;
}

/** pos_categories tidak punya kunci unik — cocokkan per nama. */
async function upsertPosCategory(c, name, order) {
  const { rows } = await c.query(`SELECT id FROM pos.pos_categories WHERE lower(name) = lower($1) ORDER BY created_at LIMIT 1`, [name]);
  if (rows[0]) {
    await c.query(
      `UPDATE pos.pos_categories SET name = $2, display_order = $3, is_active = true, parent_id = NULL, updated_at = NOW() WHERE id = $1`,
      [rows[0].id, name, order]
    );
    return rows[0].id;
  }
  const ins = await c.query(`INSERT INTO pos.pos_categories (name, display_order, is_active) VALUES ($1, $2, true) RETURNING id`, [name, order]);
  return ins.rows[0].id;
}

const UPSERT_ITEM_PRODUCT_SQL = `
  INSERT INTO item.products
    (kode, nama, deskripsi, kategori, satuan_id, harga_jual, harga_modal, station,
     production_output_type, warehouse_id, company_id, branch_id, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'merchandise', 'FINISHED_GOOD', $8, $9, $10, true)
  ON CONFLICT (
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    warehouse_id,
    kode
  ) WHERE deleted_at IS NULL
  DO UPDATE SET
    nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, kategori = EXCLUDED.kategori,
    satuan_id = EXCLUDED.satuan_id, harga_jual = EXCLUDED.harga_jual, harga_modal = EXCLUDED.harga_modal,
    station = EXCLUDED.station, is_active = true, deleted_at = NULL, updated_at = NOW()
  RETURNING id
`;

const UPSERT_POS_PRODUCT_SQL = `
  INSERT INTO pos.pos_products
    (sku, name, description, long_description, category_id, base_price, cost_price, station,
     product_kind, inventory_tracking, inventory_quantity, inventory_min_stock,
     source_product_id, image_url, weight_gram, sales_channels, is_active, is_available)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'merchandise', 'merchandise', true, $8, $9, $10, $11, $12,
          ARRAY['pos']::text[], true, true)
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, long_description = EXCLUDED.long_description,
    category_id = EXCLUDED.category_id, base_price = EXCLUDED.base_price, cost_price = EXCLUDED.cost_price,
    station = EXCLUDED.station, product_kind = 'merchandise', inventory_tracking = true,
    inventory_quantity = EXCLUDED.inventory_quantity, inventory_min_stock = EXCLUDED.inventory_min_stock,
    source_product_id = EXCLUDED.source_product_id, image_url = EXCLUDED.image_url,
    weight_gram = EXCLUDED.weight_gram, sales_channels = EXCLUDED.sales_channels,
    is_active = true, is_available = true, updated_at = NOW()
  RETURNING id
`;

async function upsertSku(c, productId, v) {
  const { rows } = await c.query(`SELECT id FROM pos.pos_product_skus WHERE lower(sku) = lower($1) LIMIT 1`, [v.sku]);
  const params = [productId, v.sku, v.name, JSON.stringify(v.options), v.barcode, v.price_override ?? null, v.stock];
  if (rows[0]) {
    await c.query(
      `UPDATE pos.pos_product_skus
       SET product_id = $2, sku = $3, name = $4, options = $5::jsonb, barcode = $6, price_override = $7,
           stock_quantity = $8, is_active = true, updated_at = NOW()
       WHERE id = $1`,
      [rows[0].id, ...params]
    );
    return rows[0].id;
  }
  const ins = await c.query(
    `INSERT INTO pos.pos_product_skus (product_id, sku, name, options, barcode, price_override, stock_quantity, is_active)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, true) RETURNING id`,
    params
  );
  return ins.rows[0].id;
}

runSeeder("Seeding katalog retail Paddy", async (c, scope) => {
  const stall = await firstStall(c, scope.branch_id);
  if (!stall) throw new Error("Belum ada stall/gudang aktif untuk cabang ini.");
  console.log(`  stall: ${stall.name}`);

  const { pcsId, fnbOff } = await upsertUnits(c, scope.company_id);
  console.log(`  ✓ satuan retail ${UNITS.length} (satuan F&B dinonaktifkan: ${fnbOff})`);
  await upsertBrand(c);
  console.log("  ✓ brand Paddy");

  const categoryNameByCode = new Map();
  const posCategoryByCode = new Map();
  for (const [i, cat] of CATALOG.categories.entries()) {
    await c.query(
      `INSERT INTO item.product_categories (code, nama, deskripsi, company_id, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (company_id, code) WHERE deleted_at IS NULL AND company_id IS NOT NULL
       DO UPDATE SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, is_active = true,
                     deleted_at = NULL, updated_at = NOW()`,
      [cat.code, cat.name, cat.description, scope.company_id]
    );
    categoryNameByCode.set(cat.code, cat.name);
    posCategoryByCode.set(cat.code, await upsertPosCategory(c, cat.name, i + 1));
  }
  console.log(`  ✓ kategori ${CATALOG.categories.length}`);

  const productSkus = [];
  const variantSkus = [];
  let variantCount = 0;
  let totalUnits = 0;
  for (const p of CATALOG.products) {
    const hasVariants = p.variants.length > 0;
    const variants = hasVariants
      ? p.variants
      : [{ sku: `${p.sku}-STD`, name: "Standar", options: {}, barcode: p.barcode, stock: p.stock }];
    const stock = variants.reduce((n, v) => n + v.stock, 0);
    totalUnits += stock;

    const item = await c.query(UPSERT_ITEM_PRODUCT_SQL, [
      p.sku, p.name, p.description, p.category, pcsId, p.price, p.cost,
      stall.id, scope.company_id, scope.branch_id,
    ]);
    const itemId = item.rows[0].id;

    const longDescription = [
      p.description,
      p.compare_at_price ? `Harga normal Rp ${p.compare_at_price.toLocaleString("id-ID")}.` : null,
      hasVariants ? `Varian: ${[...new Set(p.variants.flatMap((v) => Object.keys(v.options)))].join(", ")}.` : null,
    ].filter(Boolean).join(" ");
    const pos = await c.query(UPSERT_POS_PRODUCT_SQL, [
      p.sku, p.name, p.description, longDescription, posCategoryByCode.get(p.category),
      p.price, p.cost, 0, LOW_STOCK_THRESHOLD, itemId, p.image, p.weight_gram,
    ]);
    const posId = pos.rows[0].id;

    await c.query(
      `INSERT INTO pos.pos_inventory_settings (product_id, allow_negative_stock, low_stock_threshold)
       VALUES ($1, false, $2)
       ON CONFLICT (product_id) DO UPDATE SET allow_negative_stock = false, low_stock_threshold = EXCLUDED.low_stock_threshold, updated_at = NOW()`,
      [posId, LOW_STOCK_THRESHOLD]
    );

    await c.query(`DELETE FROM pos.pos_product_images WHERE product_id = $1`, [posId]);
    if (p.image) {
      await c.query(`INSERT INTO pos.pos_product_images (product_id, url, display_order) VALUES ($1, $2, 0)`, [posId, p.image]);
    }

    for (const v of variants) {
      await upsertSku(c, posId, v);
      variantSkus.push(v.sku.toLowerCase());
      variantCount += 1;
    }

    await c.query(
      `INSERT INTO inventory.finished_goods_inventory (product_id, qty_available, unit_cost, last_movement_at, is_active)
       VALUES ($1, $2, $3, NOW(), true)
       ON CONFLICT (product_id) DO UPDATE SET qty_available = EXCLUDED.qty_available, unit_cost = EXCLUDED.unit_cost,
         last_movement_at = NOW(), is_active = true, updated_at = NOW()`,
      [itemId, stock, p.cost]
    );

    productSkus.push(p.sku);
    console.log(
      `  ✓ ${p.sku.padEnd(11)} ${p.name.slice(0, 40).padEnd(40)} Rp ${p.price.toLocaleString("id-ID").padStart(7)}` +
        `  ${hasVariants ? `${String(p.variants.length).padStart(2)} varian` : "tunggal  "}  stok ${stock}`
    );
  }

  // "Replace": yang tidak ada di katalog dinonaktifkan, bukan dihapus.
  const offSku = await c.query(
    `UPDATE pos.pos_product_skus SET is_active = false, updated_at = NOW()
     WHERE is_active AND NOT (lower(sku) = ANY($1::text[]))`,
    [variantSkus]
  );
  const offPos = await c.query(
    `UPDATE pos.pos_products SET is_active = false, is_available = false, updated_at = NOW()
     WHERE is_active AND product_kind <> 'gift_card' AND NOT (sku = ANY($1::text[]))`,
    [productSkus]
  );
  const offItem = await c.query(
    `UPDATE item.products SET is_active = false, updated_at = NOW()
     WHERE is_active AND company_id = $1 AND production_output_type = 'FINISHED_GOOD' AND NOT (kode = ANY($2::text[]))`,
    [scope.company_id, productSkus]
  );
  const offCat = await c.query(
    `UPDATE item.product_categories SET is_active = false, updated_at = NOW()
     WHERE is_active AND company_id = $1 AND NOT (code = ANY($2::text[]))`,
    [scope.company_id, CATALOG.categories.map((cat) => cat.code)]
  );
  const offPosCat = await c.query(
    `UPDATE pos.pos_categories SET is_active = false, updated_at = NOW()
     WHERE is_active AND NOT (id = ANY($1::uuid[]))`,
    [[...posCategoryByCode.values()]]
  );
  console.log(
    `  Dinonaktifkan (tidak ada di katalog): ${offPos.rowCount} produk POS, ${offSku.rowCount} varian, ` +
      `${offItem.rowCount} produk katalog, ${offCat.rowCount + offPosCat.rowCount} kategori.`
  );

  return {
    kategori: CATALOG.categories.length,
    produk: CATALOG.products.length,
    "SKU/varian": variantCount,
    "total stok (pcs)": totalUnits,
  };
});
