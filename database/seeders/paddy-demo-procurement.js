#!/usr/bin/env node
/**
 * Seeder demo Procurement Paddy: supplier retail, purchase request, purchase order.
 *
 * Dua jalur pembelian retail:
 *   - module_type 'product'      : restock barang dagangan jadi (smartwatch,
 *                                  tas, strap, parfum, case polos) dari pabrik/importir
 *   - module_type 'raw_material' : bahan workshop cetak (blank case, tinta UV)
 *                                  dan kemasan
 * Setiap PR/PO berisi baris item yang menunjuk produk/bahan dari
 * paddy-catalog.js & paddy-supplies.js, sehingga total dokumen = jumlah baris.
 * Harga beli = HPP katalog (ASUMSI demo).
 *
 * Idempotent: supplier upsert per kode; PR/PO dikenali lewat nomor dokumen
 * ber-prefix DEMO- dan baris itemnya ditulis ulang tiap jalan.
 * Prasyarat: paddy-catalog, paddy-supplies, paddy-hris.
 *
 * Usage:
 *   node database/seeders/paddy-demo-procurement.js
 *   npm run db:seed:paddy-procurement
 */

const { dayFrom, runSeeder, anyAdmin } = require("./lib/paddy-demo");

/** [kode, nama, pic, telepon, kota, kategori, catatan, termin] — nama & kontak fiktif */
const SUPPLIERS = [
  ["SUP-PDY-001", "PT Sinar Aksesoris Gadget", "Hendra Wijaya", "081122334455", "Jakarta Utara", "case", "Importir case HP polos & blank case untuk UV print", "NET 30"],
  ["SUP-PDY-002", "CV Tekno Wearable Indonesia", "Andi Prakoso", "081233445566", "Jakarta Barat", "elektronik", "Distributor smartwatch & strap OEM, garansi resmi", "NET 30"],
  ["SUP-PDY-003", "CV Kulit Garut Mandiri", "Dewi Puspita", "081344556677", "Garut", "tas", "Produsen tas kulit & backpack, maklon merek Paddy", "NET 14"],
  ["SUP-PDY-004", "Rajut Craft Bandung", "Siti Aminah", "081455667788", "Bandung", "apparel", "Knitwear & knitted bag handmade", "NET 14"],
  ["SUP-PDY-005", "PT Warna Digital UV", "Rahmat Iskandar", "081566778899", "Tangerang", "tinta", "Tinta UV LED, varnish, primer, sparepart printer UV", "NET 30"],
  ["SUP-PDY-006", "CV Kemasan Prima", "Lina Mardiana", "081677889900", "Bandung", "kemasan", "Box bermerek, poly mailer, paper bag, hangtag", "NET 30"],
  ["SUP-PDY-007", "PT Aroma Nusantara Lab", "Yuliani Sari", "081788990011", "Bogor", "parfum", "Maklon body mist & parfum", "NET 30"],
];

/**
 * Item: ["P", sku_produk, qty] = barang dagangan; ["R", kode_bahan, qty] = bahan (qty dalam satuan besar).
 * [nomor, prioritas, status, modul, catatan, hari_dibutuhkan, items]
 */
const PURCHASE_REQUESTS = [
  ["DEMO-PR-2601", "high", "approved", "product", "Restock smartwatch jelang payday sale", 5,
    [["P", "PDY-WT-002", 12], ["P", "PDY-WT-004", 15], ["P", "PDY-WT-003", 6]]],
  ["DEMO-PR-2602", "medium", "pending_head", "raw_material", "Blank case & tinta UV untuk produksi katalog 2 minggu", 7,
    [["R", "PDY-RM-001", 4], ["R", "PDY-RM-003", 4], ["R", "PDY-RM-014", 2], ["R", "PDY-RM-010", 1]]],
  ["DEMO-PR-2603", "urgent", "pending_finance", "raw_material", "Poly mailer & label resi menipis — order online naik", 2,
    [["R", "PDY-RM-023", 5], ["R", "PDY-RM-032", 6]]],
  ["DEMO-PR-2604", "low", "draft", "product", "Usulan warna baru Knitted Bag untuk koleksi akhir tahun", 21,
    [["P", "PDY-BG-005", 20]]],
];

/** [nomor, supplier_kode, status, modul, catatan, hari_po, hari_kirim, items] */
const PURCHASE_ORDERS = [
  ["DEMO-PO-2601", "SUP-PDY-002", "approved", "product", "Restock Paddywatch Nea & Hazel Pro", -6, 3,
    [["P", "PDY-WT-002", 12], ["P", "PDY-WT-004", 15]]],
  ["DEMO-PO-2602", "SUP-PDY-001", "sent", "product", "Case polos Ultra Tech+ & Ultra Grip 2.0", -3, 2,
    [["P", "PDY-CS-001", 48], ["P", "PDY-CS-002", 36]]],
  ["DEMO-PO-2603", "SUP-PDY-005", "approved", "raw_material", "Tinta UV CMYK + white ink", -2, 5,
    [["R", "PDY-RM-010", 1], ["R", "PDY-RM-011", 1], ["R", "PDY-RM-012", 1], ["R", "PDY-RM-013", 1], ["R", "PDY-RM-014", 2]]],
  ["DEMO-PO-2604", "SUP-PDY-006", "draft", "raw_material", "Box case, poly mailer, paper bag", 0, 7,
    [["R", "PDY-RM-020", 5], ["R", "PDY-RM-023", 10], ["R", "PDY-RM-041", 4]]],
  ["DEMO-PO-2605", "SUP-PDY-003", "received", "product", "Gizli Leather Backpack batch September", -20, -12,
    [["P", "PDY-BG-004", 25]]],
];

runSeeder("Seeding demo Procurement", async (c, scope) => {
  const admin = await anyAdmin(c);

  // ── Supplier ──────────────────────────────────────────────────────────────
  const supplierIds = new Map();
  for (const [kode, nama, pic, phone, kota, kategori, catatan, terms] of SUPPLIERS) {
    const { rows } = await c.query(
      `INSERT INTO purchasing.suppliers
         (kode, nama_supplier, pic_name, pic_phone, telepon, kota, kategori, catatan,
          payment_terms, currency, status, is_active, company_id, branch_id, created_by)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,'IDR','active',true,$9,$10,$11)
       ON CONFLICT (
         COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
         COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
         kode
       ) WHERE deleted_at IS NULL
       DO UPDATE SET
         nama_supplier = EXCLUDED.nama_supplier,
         pic_name = EXCLUDED.pic_name,
         pic_phone = EXCLUDED.pic_phone,
         telepon = EXCLUDED.telepon,
         kota = EXCLUDED.kota,
         kategori = EXCLUDED.kategori,
         catatan = EXCLUDED.catatan,
         payment_terms = EXCLUDED.payment_terms,
         is_active = true,
         deleted_at = NULL,
         updated_at = NOW()
       RETURNING id`,
      [kode, nama, pic, phone, kota, kategori, catatan, terms, scope.company_id, scope.branch_id, admin?.id ?? null]
    );
    supplierIds.set(kode, rows[0].id);
    console.log(`  ✓ supplier ${kode} — ${nama}`);
  }

  // ── Referensi item: produk (harga beli = HPP katalog) & bahan (harga per satuan besar) ──
  const { rows: prodRows } = await c.query(
    `SELECT id, kode, nama, satuan_id, harga_modal FROM item.products
     WHERE company_id = $1 AND deleted_at IS NULL AND is_active`,
    [scope.company_id]
  );
  const products = new Map(prodRows.map((r) => [r.kode, r]));
  const { rows: rmRows } = await c.query(
    `SELECT rm.id, rm.kode, rm.nama, rm.satuan_besar_id AS satuan_id, rm.harga_beli, u.kode AS unit
     FROM item.raw_materials rm LEFT JOIN item.units u ON u.id = rm.satuan_besar_id
     WHERE rm.company_id = $1 AND rm.deleted_at IS NULL AND rm.is_active`,
    [scope.company_id]
  );
  const materials = new Map(rmRows.map((r) => [r.kode, r]));
  const { rows: pcsRows } = await c.query(`SELECT id FROM item.units WHERE company_id = $1 AND upper(kode) = 'PCS' LIMIT 1`, [scope.company_id]);

  function resolveLine([kind, code, qty]) {
    const ref = kind === "P" ? products.get(code) : materials.get(code);
    if (!ref) throw new Error(`Item ${code} belum ada — jalankan paddy-catalog / paddy-supplies dulu.`);
    const price = Number(kind === "P" ? ref.harga_modal : ref.harga_beli) || 0;
    return {
      productId: kind === "P" ? ref.id : null,
      rawMaterialId: kind === "R" ? ref.id : null,
      satuanId: ref.satuan_id ?? pcsRows[0]?.id ?? null,
      unit: kind === "P" ? "PCS" : ref.unit || "PCS",
      name: ref.nama,
      qty,
      price,
      subtotal: price * qty,
    };
  }

  // ── Purchase Request ──────────────────────────────────────────────────────
  // requester & department wajib: utamakan staf Procurement.
  const { rows: emp } = await c.query(
    `SELECT e.id, e.department_id FROM hris.employees e
     LEFT JOIN hris.departments d ON d.id = e.department_id
     WHERE e.is_active AND e.department_id IS NOT NULL
     ORDER BY (d.code = 'PROC') DESC, e.created_at LIMIT 1`
  );
  const requesterId = emp[0]?.id ?? null;
  const departmentId = emp[0]?.department_id ?? null;

  let prCount = 0;
  let prLines = 0;
  if (!requesterId || !departmentId) {
    console.log("  ! PR dilewati: butuh minimal 1 karyawan aktif ber-departemen (jalankan paddy-hris dulu).");
  } else {
    for (const [nomor, prio, status, modul, notes, needDays, items] of PURCHASE_REQUESTS) {
      const lines = items.map(resolveLine);
      const total = lines.reduce((n, l) => n + l.subtotal, 0);
      const { rows } = await c.query(
        `INSERT INTO purchasing.purchase_requests
           (pr_number, requester_id, department_id, status, total_amount, priority, notes,
            required_date, company_id, branch_id, module_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date,$9,$10,$11)
         ON CONFLICT (pr_number) DO UPDATE SET
           status = EXCLUDED.status, total_amount = EXCLUDED.total_amount, priority = EXCLUDED.priority,
           notes = EXCLUDED.notes, required_date = EXCLUDED.required_date, module_type = EXCLUDED.module_type,
           updated_at = NOW()
         RETURNING id`,
        [nomor, requesterId, departmentId, status, total, prio, notes, dayFrom(needDays), scope.company_id, scope.branch_id, modul]
      );
      const prId = rows[0].id;
      await c.query(`DELETE FROM purchasing.pr_items WHERE pr_id = $1`, [prId]);
      for (const l of lines) {
        await c.query(
          `INSERT INTO purchasing.pr_items
             (pr_id, product_id, raw_material_id, satuan_id, description, qty, unit, estimated_price, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [prId, l.productId, l.rawMaterialId, l.satuanId, l.name, l.qty, l.unit, l.price, l.subtotal]
        );
        prLines += 1;
      }
      prCount += 1;
      console.log(`  ✓ PR ${nomor} (${status}, ${modul}) — ${lines.length} item, Rp ${total.toLocaleString("id-ID")}`);
    }
  }

  // ── Purchase Order ────────────────────────────────────────────────────────
  const PPN = 11;
  let poCount = 0;
  let poLines = 0;
  for (const [nomor, supKode, status, modul, catatan, poDay, kirimDay, items] of PURCHASE_ORDERS) {
    const lines = items.map(resolveLine);
    const subtotal = lines.reduce((n, l) => n + l.subtotal, 0);
    const ppn = Math.round((subtotal * PPN) / 100);
    const received = status === "received";
    const { rows } = await c.query(
      `INSERT INTO purchasing.purchase_orders
         (nomor_po, tanggal_po, tanggal_dibutuhkan, tanggal_kirim_estimasi, supplier_id, status,
          subtotal, ppn_persen, ppn_nominal, total, catatan, alamat_pengiriman, is_active,
          company_id, branch_id, module_type, source_type, created_by)
       VALUES ($1,$2::date,$3::date,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13,$14,'manual',$15)
       ON CONFLICT (nomor_po) DO UPDATE SET
         status = EXCLUDED.status, supplier_id = EXCLUDED.supplier_id, subtotal = EXCLUDED.subtotal,
         ppn_persen = EXCLUDED.ppn_persen, ppn_nominal = EXCLUDED.ppn_nominal, total = EXCLUDED.total,
         catatan = EXCLUDED.catatan, alamat_pengiriman = EXCLUDED.alamat_pengiriman,
         module_type = EXCLUDED.module_type, is_active = true, deleted_at = NULL, updated_at = NOW()
       RETURNING id`,
      [
        nomor, dayFrom(poDay), dayFrom(kirimDay), supplierIds.get(supKode) ?? null, status,
        subtotal, PPN, ppn, subtotal + ppn, catatan,
        "Paddy HQ — Jl. Kopo Permai III F2 No. 15, Kec. Cangkuang Kulon, Kab. Bandung 40227",
        scope.company_id, scope.branch_id, modul, admin?.id ?? null,
      ]
    );
    const poId = rows[0].id;
    await c.query(`DELETE FROM purchasing.purchase_order_items WHERE purchase_order_id = $1`, [poId]);
    for (const l of lines) {
      await c.query(
        `INSERT INTO purchasing.purchase_order_items
           (purchase_order_id, product_id, raw_material_id, satuan_id, qty_ordered, qty_received,
            harga_satuan, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [poId, l.productId, l.rawMaterialId, l.satuanId, l.qty, received ? l.qty : 0, l.price]
      );
      poLines += 1;
    }
    poCount += 1;
    console.log(`  ✓ PO ${nomor} — ${catatan} (${status}) Rp ${(subtotal + ppn).toLocaleString("id-ID")}`);
  }

  return {
    supplier: SUPPLIERS.length,
    "purchase request": `${prCount} (${prLines} baris)`,
    "purchase order": `${poCount} (${poLines} baris)`,
  };
});
