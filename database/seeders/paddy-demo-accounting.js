#!/usr/bin/env node
/**
 * Seeder demo Accounting Paddy: akun COA retail, tahun buku, periode, dan
 * jurnal contoh usaha retail (penjualan toko & marketplace, HPP, pembelian
 * barang dagangan, gaji, sewa toko, biaya marketplace & pengiriman).
 *
 * COA bawaan (dari template SULU) berorientasi F&B. Akun F&B TIDAK diubah
 * karena kodenya dipakai kode aplikasi (src/lib/purchasing/raw-material-coa.ts);
 * di sini hanya DITAMBAH akun retail di bawah induk yang sama, plus nama
 * beberapa akun induk dinetralkan (mis. "FB EXPENSES" → "OPERATING EXPENSES").
 *
 * Jurnal demo dibuat berpasangan (debit = kredit) dan diverifikasi seimbang
 * sebelum commit — jurnal timpang lebih berbahaya daripada tidak ada jurnal.
 *
 * Idempotent: akun per kode, tahun buku per kode, periode per (tahun, nomor), jurnal per nomor.
 *
 * Usage:
 *   node database/seeders/paddy-demo-accounting.js
 *   npm run db:seed:paddy-accounting
 */

const { runSeeder, anyAdmin } = require("./lib/paddy-demo");

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Akun induk yang namanya dinetralkan (kode tidak berubah). */
const RENAME_PARENTS = [
  ["4101000", "SALES REVENUE"],
  ["5101000", "COGS - SALES"],
  ["6000000", "OPERATING EXPENSES"],
];

/** [kode, nama, kode_induk] — akun retail baru; tipe/level/arus kas mengikuti induk. */
const RETAIL_ACCOUNTS = [
  ["1301009", "Inv - Persediaan Barang Dagang", "1301000"],
  ["1301010", "Inv - Bahan Cetak & Kemasan", "1301000"],
  ["4101003", "Penjualan Barang Dagang - Toko", "4101000"],
  ["4101004", "Penjualan Online & Marketplace", "4101000"],
  ["5101004", "HPP Barang Dagang", "5101000"],
  ["5101005", "HPP Produksi Cetak Custom", "5101000"],
  ["6101004", "Store & E-Commerce S&W", "6101000"],
  ["6301005", "Biaya Admin & Komisi Marketplace", "6301000"],
  ["6401014", "Biaya Pengiriman & Packing", "6401000"],
];

/**
 * Jurnal contoh. Tiap baris: [nomor, deskripsi, offsetHariDariHariIni, baris[]]
 * baris: [kodeAkunCOA, 'D'|'C', jumlah, memo]
 */
function journalTemplates() {
  return [
    {
      nomor: "DEMO-JV-0001",
      deskripsi: "Penjualan harian Paddy Store Kopo (tunai & QRIS)",
      offset: -7,
      lines: [
        ["1101002", "D", 2_150_000, "Kas toko"],
        ["1102001", "D", 4_720_000, "QRIS settlement"],
        ["4101003", "C", 6_870_000, "Penjualan case, pods, aksesoris"],
      ],
    },
    {
      nomor: "DEMO-JV-0002",
      deskripsi: "HPP penjualan toko harian",
      offset: -7,
      lines: [
        ["5101004", "D", 2_610_000, "HPP barang dagang terjual"],
        ["1301009", "C", 2_610_000, "Keluar persediaan barang dagang"],
      ],
    },
    {
      nomor: "DEMO-JV-0003",
      deskripsi: "Pencairan saldo penjualan marketplace (Shopee & Tokopedia)",
      offset: -6,
      lines: [
        ["1102001", "D", 11_640_000, "Dana masuk dari marketplace"],
        ["6301005", "D", 1_060_000, "Potongan admin & komisi marketplace"],
        ["4101004", "C", 12_700_000, "Penjualan online & marketplace"],
      ],
    },
    {
      nomor: "DEMO-JV-0004",
      deskripsi: "Penerimaan Gizli Leather Backpack dari CV Kulit Garut Mandiri (DEMO-PO-2605)",
      offset: -12,
      lines: [
        ["1301009", "D", 3_000_000, "25 pcs Gizli Leather Backpack"],
        ["2101001", "C", 3_000_000, "Utang dagang supplier"],
      ],
    },
    {
      nomor: "DEMO-JV-0005",
      deskripsi: "Pembayaran gaji karyawan toko, e-commerce, dan workshop",
      offset: -5,
      lines: [
        ["6101004", "D", 52_500_000, "Gaji bulanan"],
        ["1102001", "C", 52_500_000, "BANK BCA 7319"],
      ],
    },
    {
      nomor: "DEMO-JV-0006",
      deskripsi: "Sewa toko Kopo bulanan",
      offset: -4,
      lines: [
        ["6401001", "D", 12_000_000, "Rent & Occupancy Expense"],
        ["1102001", "C", 12_000_000, "BANK BCA 7319"],
      ],
    },
    {
      nomor: "DEMO-JV-0007",
      deskripsi: "Biaya pengiriman & bahan packing pesanan online",
      offset: -3,
      lines: [
        ["6401014", "D", 1_850_000, "Ongkir subsidi & bubble wrap"],
        ["1101002", "C", 1_850_000, "Kas toko"],
      ],
    },
    {
      nomor: "DEMO-JV-0008",
      deskripsi: "Pelunasan utang CV Kulit Garut Mandiri",
      offset: -2,
      lines: [
        ["2101001", "D", 3_000_000, "Pelunasan AP"],
        ["1102001", "C", 3_000_000, "BANK BCA 7319"],
      ],
    },
  ];
}

async function ensureRetailAccounts(c, companyId) {
  for (const [code, name] of RENAME_PARENTS) {
    await c.query(
      `UPDATE accounting.chart_of_accounts SET name = $2, updated_at = NOW()
       WHERE code = $1 AND (company_id IS NULL OR company_id = $3) AND deleted_at IS NULL`,
      [code, name, companyId]
    );
  }
  let added = 0;
  for (const [code, name, parentCode] of RETAIL_ACCOUNTS) {
    const { rows: parent } = await c.query(
      `SELECT id, company_id, account_type_id, level, is_contra, cash_flow_category
       FROM accounting.chart_of_accounts
       WHERE code = $1 AND (company_id IS NULL OR company_id = $2) AND deleted_at IS NULL LIMIT 1`,
      [parentCode, companyId]
    );
    if (!parent[0]) throw new Error(`Akun induk ${parentCode} tidak ada di COA.`);
    const p = parent[0];
    const { rows: found } = await c.query(
      `SELECT id FROM accounting.chart_of_accounts
       WHERE code = $1 AND (company_id IS NULL OR company_id = $2) AND deleted_at IS NULL LIMIT 1`,
      [code, companyId]
    );
    if (found[0]) {
      await c.query(
        `UPDATE accounting.chart_of_accounts SET name = $2, parent_id = $3, is_active = true, updated_at = NOW() WHERE id = $1`,
        [found[0].id, name, p.id]
      );
    } else {
      await c.query(
        `INSERT INTO accounting.chart_of_accounts
           (company_id, code, name, parent_id, account_type_id, level, is_postable, is_contra,
            cash_flow_category, description, is_active, is_cash_bank)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,'Akun retail Paddy',true,false)`,
        [p.company_id, code, name, p.id, p.account_type_id, Number(p.level) + 1, p.is_contra, p.cash_flow_category]
      );
      added += 1;
    }
  }
  return added;
}

runSeeder("Seeding demo Accounting", async (c, scope) => {
  const admin = await anyAdmin(c);
  const year = new Date().getFullYear();

  // ── Akun COA retail ───────────────────────────────────────────────────────
  const added = await ensureRetailAccounts(c, scope.company_id);
  console.log(`  ✓ akun retail ${RETAIL_ACCOUNTS.length} (${added} baru), ${RENAME_PARENTS.length} induk dinetralkan`);

  // ── Tahun buku ────────────────────────────────────────────────────────────
  const code = `FY${year}`;
  const { rows: fyFound } = await c.query(
    `SELECT id FROM accounting.fiscal_years
     WHERE code = $1 AND (company_id IS NULL OR company_id = $2) AND deleted_at IS NULL LIMIT 1`,
    [code, scope.company_id]
  );
  let fiscalYearId = fyFound[0]?.id;
  if (!fiscalYearId) {
    const { rows } = await c.query(
      `INSERT INTO accounting.fiscal_years (company_id, code, name, start_date, end_date, is_active, created_by)
       VALUES ($1,$2,$3,$4::date,$5::date,true,$6) RETURNING id`,
      [scope.company_id, code, `Tahun Buku ${year}`, `${year}-01-01`, `${year}-12-31`, admin?.id ?? null]
    );
    fiscalYearId = rows[0].id;
  }
  console.log(`  ✓ tahun buku ${code}`);

  // ── 12 periode bulanan ────────────────────────────────────────────────────
  const periodIds = new Map();
  const nowMonth = new Date().getMonth() + 1;
  for (let m = 1; m <= 12; m++) {
    const start = `${year}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(year, m, 0).toISOString().slice(0, 10);
    // Bulan lampau ditutup, bulan berjalan & mendatang terbuka.
    const status = m < nowMonth ? "CLOSED" : "OPEN"; // enum huruf besar
    const { rows: found } = await c.query(
      `SELECT id FROM accounting.fiscal_periods WHERE fiscal_year_id = $1 AND period_no = $2 LIMIT 1`,
      [fiscalYearId, m]
    );
    let id = found[0]?.id;
    if (id) {
      await c.query(
        `UPDATE accounting.fiscal_periods SET name=$2, start_date=$3::date, end_date=$4::date, status=$5, updated_at=NOW() WHERE id=$1`,
        [id, `${BULAN[m - 1]} ${year}`, start, end, status]
      );
    } else {
      const { rows } = await c.query(
        `INSERT INTO accounting.fiscal_periods (fiscal_year_id, period_no, name, start_date, end_date, status)
         VALUES ($1,$2,$3,$4::date,$5::date,$6) RETURNING id`,
        [fiscalYearId, m, `${BULAN[m - 1]} ${year}`, start, end, status]
      );
      id = rows[0].id;
    }
    periodIds.set(m, id);
  }
  console.log(`  ✓ periode 12 bulan (${nowMonth - 1} ditutup, ${12 - nowMonth + 1} terbuka)`);

  // ── Jurnal ────────────────────────────────────────────────────────────────
  const { rows: coaRows } = await c.query(
    `SELECT id, code FROM accounting.chart_of_accounts
     WHERE (company_id IS NULL OR company_id = $1) AND deleted_at IS NULL`,
    [scope.company_id]
  );
  const coaByCode = new Map(coaRows.map((r) => [String(r.code), r.id]));

  let journalCount = 0;
  let skipped = 0;
  for (const tpl of journalTemplates()) {
    const missing = tpl.lines.filter(([kode]) => !coaByCode.has(kode)).map(([kode]) => kode);
    if (missing.length > 0) {
      console.log(`  ! ${tpl.nomor} dilewati — akun COA tidak ada: ${missing.join(", ")}`);
      skipped += 1;
      continue;
    }
    const debit = tpl.lines.filter(([, s]) => s === "D").reduce((a, [, , n]) => a + n, 0);
    const kredit = tpl.lines.filter(([, s]) => s === "C").reduce((a, [, , n]) => a + n, 0);
    if (debit !== kredit) throw new Error(`${tpl.nomor} tidak seimbang: debit ${debit} vs kredit ${kredit}`);

    const d = new Date();
    d.setDate(d.getDate() + tpl.offset);
    const entryDate = d.toISOString().slice(0, 10);
    const periodId = periodIds.get(d.getMonth() + 1);

    const { rows: found } = await c.query(
      `SELECT id FROM accounting.journal_entries WHERE entry_no = $1 AND deleted_at IS NULL LIMIT 1`,
      [tpl.nomor]
    );
    let entryId = found[0]?.id;
    if (entryId) {
      await c.query(
        `UPDATE accounting.journal_entries SET entry_date=$2::date, description=$3, fiscal_period_id=$4, updated_at=NOW() WHERE id=$1`,
        [entryId, entryDate, tpl.deskripsi, periodId]
      );
      await c.query(`DELETE FROM accounting.journal_entry_lines WHERE entry_id = $1`, [entryId]);
    } else {
      const { rows } = await c.query(
        `INSERT INTO accounting.journal_entries
           (company_id, entry_no, entry_date, description, fiscal_period_id, status, entry_type, source_module, created_by)
         VALUES ($1,$2,$3::date,$4,$5,'POSTED','MANUAL','seeder',$6) RETURNING id`,
        [scope.company_id, tpl.nomor, entryDate, tpl.deskripsi, periodId, admin?.id ?? null]
      );
      entryId = rows[0].id;
    }

    let sort = 1;
    for (const [kode, sisi, jumlah, memo] of tpl.lines) {
      await c.query(
        `INSERT INTO accounting.journal_entry_lines (entry_id, account_id, entry_side, amount, memo, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        // entry_side memakai huruf besar sesuai CHECK constraint.
        [entryId, coaByCode.get(kode), sisi === "D" ? "DEBIT" : "CREDIT", jumlah, memo, sort++]
      );
    }
    journalCount += 1;
    console.log(`  ✓ jurnal ${tpl.nomor} — ${tpl.deskripsi}`);
  }

  // Verifikasi akhir: tidak boleh ada jurnal demo yang timpang.
  const { rows: check } = await c.query(
    `SELECT je.entry_no,
            SUM(CASE WHEN l.entry_side = 'DEBIT' THEN l.amount ELSE 0 END) AS d,
            SUM(CASE WHEN l.entry_side = 'CREDIT' THEN l.amount ELSE 0 END) AS k
     FROM accounting.journal_entries je
     JOIN accounting.journal_entry_lines l ON l.entry_id = je.id
     WHERE je.entry_no LIKE 'DEMO-JV-%' AND je.deleted_at IS NULL
     GROUP BY je.entry_no
     HAVING SUM(CASE WHEN l.entry_side = 'DEBIT' THEN l.amount ELSE 0 END)
         <> SUM(CASE WHEN l.entry_side = 'CREDIT' THEN l.amount ELSE 0 END)`
  );
  if (check.length > 0) throw new Error(`Jurnal timpang: ${check.map((r) => r.entry_no).join(", ")}`);

  return { "akun retail": RETAIL_ACCOUNTS.length, "tahun buku": 1, periode: 12, jurnal: journalCount, dilewati: skipped };
});
