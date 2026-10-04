#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- seeder Node CommonJS, sama seperti seeder lain */
/**
 * Seeder: bahan & perlengkapan Paddy — blank case untuk cetak custom, tinta UV,
 * kemasan, label, dan perlengkapan toko.
 *
 * Paddy menjual barang jadi, tapi case katalog/custom dicetak sendiri di
 * workshop (UV print di atas blank case). Bahan-bahan itulah yang dibeli dan
 * distok sebagai item.raw_materials, sedangkan barang dagangan jadi ada di
 * paddy-catalog.js (item.products + POS merchandise).
 *
 * Bentuk satu baris MATERIALS:
 *   [kode, nama, kategori, satuan_besar, satuan_kecil, konversi,
 *    stok_min, stok_max, storage_condition, deskripsi, harga_beli]
 *   - konversi  = jumlah satuan kecil dalam 1 satuan besar
 *   - stok_min/max dalam SATUAN BESAR — satuan yang ditampilkan dan dipakai
 *     menilai persediaan di v_raw_materials_stock (qty × harga_beli)
 *   - harga_beli = per SATUAN BESAR, rupiah — ASUMSI demo, bukan harga kontrak
 *
 * Idempotent: upsert per kode. Prasyarat: paddy-catalog.js (satuan retail).
 *
 * Usage:
 *   node database/seeders/paddy-supplies.js
 *   npm run db:seed:paddy-supplies
 */

const { runSeeder } = require("./lib/paddy-demo");

const CATEGORIES = [
  { code: "BLANK", nama: "Blank Case & Bahan Cetak", deskripsi: "Case polos untuk dicetak UV (motif katalog & custom nama)" },
  { code: "TINTA", nama: "Tinta & Coating UV", deskripsi: "Tinta UV CMYK, white ink, varnish, primer" },
  { code: "KEMASAN", nama: "Kemasan & Packing", deskripsi: "Box produk, poly mailer, bubble wrap, lakban" },
  { code: "LABEL", nama: "Label & Sticker", deskripsi: "Hangtag, sticker brand, label thermal resi" },
  { code: "TOKO", nama: "Perlengkapan Toko", deskripsi: "Kertas struk, paper bag, perlengkapan display" },
];

const MATERIALS = [
  // ── Blank case (stok per PCS; dibeli per LUSIN dari supplier) ────────────
  ["PDY-RM-001", "Blank Case Ultra Tech+ iPhone 16 Pro Max", "BLANK", "LUSIN", "PCS", 12, 2, 10, "SUHU_RUANG", "Case bening Ultra Tech+ siap cetak UV", 216000],
  ["PDY-RM-002", "Blank Case Ultra Tech+ iPhone 16 Pro", "BLANK", "LUSIN", "PCS", 12, 2, 10, "SUHU_RUANG", "Case bening Ultra Tech+ siap cetak UV", 216000],
  ["PDY-RM-003", "Blank Case Ultra Tech+ iPhone 15", "BLANK", "LUSIN", "PCS", 12, 2, 10, "SUHU_RUANG", "Case bening Ultra Tech+ siap cetak UV", 204000],
  ["PDY-RM-004", "Blank Case Ultra Tech+ iPhone 13", "BLANK", "LUSIN", "PCS", 12, 1, 6, "SUHU_RUANG", "Case bening Ultra Tech+ siap cetak UV", 192000],
  ["PDY-RM-005", "Blank Case Ultra Tech+ Samsung Galaxy A55", "BLANK", "LUSIN", "PCS", 12, 1, 6, "SUHU_RUANG", "Case bening Ultra Tech+ siap cetak UV", 192000],
  ["PDY-RM-006", "Blank Case Ultra Tech+ Redmi Note 13", "BLANK", "LUSIN", "PCS", 12, 1, 6, "SUHU_RUANG", "Case bening Ultra Tech+ siap cetak UV", 180000],
  ["PDY-RM-007", "Blank Pods Case Silicone", "BLANK", "LUSIN", "PCS", 12, 1, 5, "SUHU_RUANG", "Case AirPods silikon polos untuk cetak motif", 240000],
  ["PDY-RM-008", "Blank Acrylic Popsocket", "BLANK", "LUSIN", "PCS", 12, 2, 10, "SUHU_RUANG", "Pop socket acrylic polos", 132000],
  // ── Tinta & coating UV (stok per ML; dibeli per BTL 1L) ───────────────────
  ["PDY-RM-010", "Tinta UV Cyan", "TINTA", "BTL", "ML", 1000, 1, 4, "KHUSUS", "Tinta UV LED cyan, simpan jauh dari cahaya", 950000],
  ["PDY-RM-011", "Tinta UV Magenta", "TINTA", "BTL", "ML", 1000, 1, 4, "KHUSUS", "Tinta UV LED magenta, simpan jauh dari cahaya", 950000],
  ["PDY-RM-012", "Tinta UV Yellow", "TINTA", "BTL", "ML", 1000, 1, 4, "KHUSUS", "Tinta UV LED yellow, simpan jauh dari cahaya", 950000],
  ["PDY-RM-013", "Tinta UV Black", "TINTA", "BTL", "ML", 1000, 1, 4, "KHUSUS", "Tinta UV LED black, simpan jauh dari cahaya", 950000],
  ["PDY-RM-014", "Tinta UV White", "TINTA", "BTL", "ML", 1000, 1, 5, "KHUSUS", "White ink untuk dasar cetak di case bening", 1150000],
  ["PDY-RM-015", "UV Varnish Gloss", "TINTA", "BTL", "ML", 1000, 1, 3, "KHUSUS", "Lapisan glossy anti-gores hasil cetak", 850000],
  ["PDY-RM-016", "Primer Adhesion TPU/PC", "TINTA", "BTL", "ML", 500, 1, 3, "KHUSUS", "Primer agar tinta menempel di bahan TPU/PC", 420000],
  // ── Kemasan ───────────────────────────────────────────────────────────────
  ["PDY-RM-020", "Box Case Paddy", "KEMASAN", "PACK", "PCS", 100, 2, 15, "SUHU_RUANG", "Box kertas bermerek untuk case HP, pack isi 100", 350000],
  ["PDY-RM-021", "Box Pods Paddy", "KEMASAN", "PACK", "PCS", 100, 1, 6, "SUHU_RUANG", "Box kecil bermerek untuk pods & charm, pack isi 100", 280000],
  ["PDY-RM-022", "Box Smartwatch Paddy", "KEMASAN", "PACK", "PCS", 50, 1, 4, "SUHU_RUANG", "Box hard case untuk Paddy Watch, pack isi 50", 600000],
  ["PDY-RM-023", "Poly Mailer Paddy 25x35", "KEMASAN", "PACK", "PCS", 100, 3, 20, "SUHU_RUANG", "Plastik kirim bermerek untuk pesanan online", 145000],
  ["PDY-RM-024", "Bubble Wrap 50cm", "KEMASAN", "ROLL", "PCS", 1, 2, 12, "SUHU_RUANG", "Bubble wrap roll 50cm x 50m", 165000],
  ["PDY-RM-025", "Lakban Bening 2 inci", "KEMASAN", "LUSIN", "ROLL", 6, 1, 6, "SUHU_RUANG", "Lakban bening, slop isi 6 roll", 78000],
  // ── Label & sticker ───────────────────────────────────────────────────────
  ["PDY-RM-030", "Hangtag Paddy", "LABEL", "PACK", "PCS", 500, 1, 6, "SUHU_RUANG", "Hangtag kertas art carton untuk tas & apparel", 250000],
  ["PDY-RM-031", "Sticker Logo Paddy", "LABEL", "PACK", "LBR", 500, 1, 6, "SUHU_RUANG", "Sticker vinyl logo Paddy, bonus tiap pesanan", 175000],
  ["PDY-RM-032", "Label Thermal 100x150", "LABEL", "ROLL", "LBR", 500, 2, 12, "SUHU_RUANG", "Label resi thermal untuk marketplace", 85000],
  ["PDY-RM-033", "Label Barcode 33x15", "LABEL", "ROLL", "LBR", 2000, 1, 6, "SUHU_RUANG", "Label barcode SKU untuk rak toko", 65000],
  // ── Perlengkapan toko ─────────────────────────────────────────────────────
  ["PDY-RM-040", "Kertas Struk Thermal 58mm", "TOKO", "BOX", "ROLL", 50, 1, 3, "SUHU_RUANG", "Kertas struk kasir, box isi 50 roll", 220000],
  ["PDY-RM-041", "Paper Bag Paddy Medium", "TOKO", "PACK", "PCS", 50, 2, 12, "SUHU_RUANG", "Paper bag bermerek untuk belanja di toko", 275000],
  ["PDY-RM-042", "Paper Bag Paddy Large", "TOKO", "PACK", "PCS", 50, 1, 6, "SUHU_RUANG", "Paper bag besar untuk tas & apparel", 350000],
];

const CATEGORY_SQL = `
  INSERT INTO item.raw_material_categories (code, nama, deskripsi, company_id, is_active)
  VALUES ($1, $2, $3, $4, true)
  ON CONFLICT (company_id, code) WHERE company_id IS NOT NULL AND deleted_at IS NULL DO UPDATE
    SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, is_active = true,
        deleted_at = NULL, updated_at = NOW()
`;

const MATERIAL_SQL = `
  INSERT INTO item.raw_materials
    (kode, nama, kategori, deskripsi, satuan_besar_id, satuan_kecil_id, konversi_factor,
     stok_minimum, stok_maximum, storage_condition, harga_beli, material_type,
     company_id, branch_id, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PURCHASED', $12, $13, true)
  ON CONFLICT (
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    kode
  ) WHERE deleted_at IS NULL
  DO UPDATE SET
    nama = EXCLUDED.nama, kategori = EXCLUDED.kategori, deskripsi = EXCLUDED.deskripsi,
    satuan_besar_id = EXCLUDED.satuan_besar_id, satuan_kecil_id = EXCLUDED.satuan_kecil_id,
    konversi_factor = EXCLUDED.konversi_factor, stok_minimum = EXCLUDED.stok_minimum,
    stok_maximum = EXCLUDED.stok_maximum, storage_condition = EXCLUDED.storage_condition,
    harga_beli = EXCLUDED.harga_beli, is_active = true, deleted_at = NULL, updated_at = NOW()
`;

runSeeder("Seeding bahan & perlengkapan Paddy", async (c, scope) => {
  const { rows: unitRows } = await c.query(
    `SELECT id, upper(kode) AS kode FROM item.units WHERE company_id = $1 AND deleted_at IS NULL AND is_active`,
    [scope.company_id]
  );
  const unitMap = new Map(unitRows.map((r) => [r.kode, r.id]));
  const uid = (code) => {
    const id = unitMap.get(code);
    if (!id) throw new Error(`Satuan "${code}" tidak ditemukan. Jalankan dulu: npm run db:seed:paddy-catalog`);
    return id;
  };

  for (const cat of CATEGORIES) {
    await c.query(CATEGORY_SQL, [cat.code, cat.nama, cat.deskripsi, scope.company_id]);
  }
  console.log(`  ✓ kategori bahan ${CATEGORIES.length}`);

  for (const [kode, nama, kategori, besar, kecil, konv, min, max, storage, deskripsi, harga] of MATERIALS) {
    await c.query(MATERIAL_SQL, [
      kode, nama, kategori, deskripsi, uid(besar), uid(kecil), konv,
      min, max, storage, harga, scope.company_id, scope.branch_id,
    ]);
    console.log(`  ✓ ${kode} — ${nama}`);
  }

  return { kategori: CATEGORIES.length, "bahan & perlengkapan": MATERIALS.length };
});
