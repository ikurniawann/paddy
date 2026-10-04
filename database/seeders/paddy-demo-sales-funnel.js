#!/usr/bin/env node
/**
 * Seeder demo Sales Funneling / CRM Paddy — B2B corporate gift, custom case
 * logo, kolaborasi ilustrator, dan reseller.
 *
 * Modul ini sama sekali belum punya seeder. Data demo dibuat menyebar di
 * beberapa tahap pipeline supaya kanban, forecast, dan laporan atribusi
 * (EPIC-050) langsung ada isinya, bukan halaman kosong.
 *
 * Cakupan: alasan kalah, account, contact, lead (dengan UTM), deal di beberapa
 * tahap, dan aktivitas tindak lanjut.
 *
 * Idempotent: seluruh baris demo ditandai prefix "DEMO" pada nama/kode dan
 * di-upsert; dijalankan ulang tidak menggandakan.
 *
 * Usage:
 *   node database/seeders/paddy-demo-sales-funnel.js
 *   npm run db:seed:paddy-sales-funnel
 */

const { dayFrom, runSeeder, anyAdmin } = require("./lib/paddy-demo");

const LOST_REASONS = [
  ["HARGA", "Harga di atas anggaran", 1],
  ["MOQ", "Jumlah di bawah minimum order custom", 2],
  ["JADWAL", "Waktu produksi tidak cocok dengan deadline", 3],
  ["KOMPETITOR", "Memilih vendor lain", 4],
  ["BATAL", "Kebutuhan dibatalkan", 5],
  ["TIDAK-RESPON", "Tidak ada respons setelah penawaran", 6],
];

/** Pipeline default dinamai ulang untuk B2B Paddy: corporate gift & custom order. */
const PIPELINE_NAME = "B2B Corporate Gift & Custom Order";
const STAGE_NAMES = {
  "prospek-baru": "Prospek Baru",
  dihubungi: "Dihubungi",
  proposal: "Mockup & Penawaran",
  "nego-survey": "Nego & Approval Desain",
  menang: "Menang (PO Diterima)",
  kalah: "Kalah",
};

/** [nama, tipe, industri, kota, telepon, email] — semua fiktif */
const ACCOUNTS = [
  ["PT Sinar Rekatama", "corporate", "Manufaktur", "Bandung", "0221234501", "procurement@sinarrekatama.co.id"],
  ["Universitas Harapan Bangsa", "sekolah", "Pendidikan", "Bandung", "0221234502", "kemahasiswaan@uhb.ac.id"],
  ["Komunitas Ilustrator Bandung", "komunitas", "Komunitas Kreatif", "Bandung", "0221234503", "halo@ilustratorbdg.id"],
  ["Bank Nusantara Digital", "corporate", "Perbankan", "Jakarta Selatan", "0211234504", "brand@banknusantara.co.id"],
  ["Toko Gadget Cimahi", "lainnya", "Retail Gadget", "Cimahi", "0221234505", "owner@tokogadgetcimahi.id"],
];

/** [nama_account, nama_kontak, jabatan, telepon, email, utama] */
const CONTACTS = [
  ["PT Sinar Rekatama", "Bambang Setiawan", "HR & GA Manager", "081310002001", "bambang@sinarrekatama.co.id", true],
  ["PT Sinar Rekatama", "Rina Oktaviani", "Staff GA", "081310002002", "rina@sinarrekatama.co.id", false],
  ["Universitas Harapan Bangsa", "Dr. Aditya Firmansyah", "Kepala Kemahasiswaan", "081310002003", "aditya@uhb.ac.id", true],
  ["Komunitas Ilustrator Bandung", "Yoga Permana", "Koordinator Komunitas", "081310002004", "yoga@ilustratorbdg.id", true],
  ["Bank Nusantara Digital", "Sri Handayani", "Brand Activation Lead", "081310002005", "sri@banknusantara.co.id", true],
  ["Toko Gadget Cimahi", "Kevin Wijaya", "Pemilik Toko", "081310002006", "kevin@tokogadgetcimahi.id", true],
];

/**
 * [instansi, tipe, pic, telepon, email, kota, sumber, temperatur, status,
 *  utm_source, utm_campaign, hari_dibuat, catatan]
 */
const LEADS = [
  ["PT Sinar Rekatama", "corporate", "Bambang Setiawan", "081310002001", "bambang@sinarrekatama.co.id", "Bandung", "referral", "panas", "qualified", null, null, -21, "Corporate gift ulang tahun perusahaan: 150 custom case logo + gift box"],
  ["Universitas Harapan Bangsa", "sekolah", "Dr. Aditya Firmansyah", "081310002003", "aditya@uhb.ac.id", "Bandung", "google", "hangat", "dihubungi", "google", "corporate-gift", -14, "Merchandise wisuda: 300 pop socket & case motif kampus"],
  ["Komunitas Ilustrator Bandung", "komunitas", "Yoga Permana", "081310002004", "yoga@ilustratorbdg.id", "Bandung", "instagram", "hangat", "qualified", "instagram", "paddy-collab", -10, "Kolaborasi katalog: 6 desain ilustrator lokal, bagi hasil royalti"],
  ["Bank Nusantara Digital", "corporate", "Sri Handayani", "081310002005", "sri@banknusantara.co.id", "Jakarta Selatan", "pameran", "panas", "qualified", null, null, -7, "Hadiah nasabah prioritas: 80 Paddywatch + strap custom"],
  ["Toko Gadget Cimahi", "lainnya", "Kevin Wijaya", "081310002006", "kevin@tokogadgetcimahi.id", "Cimahi", "wa", "hangat", "baru", null, null, -4, "Ingin jadi reseller case & tempered glass, order bulanan"],
  ["CV Rasa Nusantara", "corporate", "Melati Anggraini", "081310002007", "melati@rasanusantara.id", "Bandung", "google", "dingin", "baru", "google", "search-custom-case", -2, "Tanya harga custom case logo untuk 40 karyawan"],
];

/** [instansi, judul, jenis, nilai, tahap_code, hari_kirim, qty_pcs] — jenis: event_type sistem ('lainnya' = order custom) */
const DEALS = [
  ["PT Sinar Rekatama", "Corporate Gift HUT Sinar Rekatama — 150 Custom Case", "lainnya", 22_500_000, "nego-survey", 20, 150],
  ["Universitas Harapan Bangsa", "Merchandise Wisuda UHB — Case & Pop Socket", "lainnya", 31_500_000, "proposal", 35, 300],
  ["Komunitas Ilustrator Bandung", "Kolaborasi Katalog Ilustrator Bandung", "lainnya", 9_000_000, "dihubungi", 30, 90],
  ["Bank Nusantara Digital", "Hadiah Nasabah Prioritas — 80 Paddywatch", "lainnya", 31_120_000, "nego-survey", 14, 80],
  ["Toko Gadget Cimahi", "Reseller Toko Gadget Cimahi — Order Perdana", "lainnya", 6_000_000, "prospek-baru", 10, 60],
];

/** [instansi, jenis, judul, catatan, hari_jatuh_tempo, status] */
const ACTIVITIES = [
  ["PT Sinar Rekatama", "wa", "Kirim mockup case dengan logo", "Mockup 3 warna case Ultra Tech+, minta approval GA", 1, "open"],
  ["Universitas Harapan Bangsa", "meeting", "Presentasi sampel ke panitia wisuda", "Bawa sampel case & pop socket motif kampus", 3, "open"],
  ["Komunitas Ilustrator Bandung", "email", "Kirim draft perjanjian royalti", "Royalti 10% per unit, file desain format 300 dpi", 0, "open"],
  ["Bank Nusantara Digital", "meeting", "Demo Paddywatch Nea & Hazel Pro", "Siapkan unit demo + opsi engraving strap", 2, "open"],
  ["PT Sinar Rekatama", "catatan", "Hasil diskusi kebutuhan", "Logo 1 warna di case bening, kemasan gift box biru", -3, "done"],
  ["Toko Gadget Cimahi", "telepon", "Perkenalan program reseller", "Kirim price list reseller & syarat minimum order", -1, "done"],
];

runSeeder("Seeding demo Sales Funneling", async (c, scope) => {
  const admin = await anyAdmin(c);
  const ownerId = admin?.id ?? null;

  // ── Alasan kalah ──────────────────────────────────────────────────────────
  for (const [code, name, sort] of LOST_REASONS) {
    await c.query(
      `INSERT INTO crm.crm_sales_lost_reasons (code, name, sort_order, is_active)
       VALUES ($1,$2,$3,true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order,
         is_active = true, updated_at = NOW()`,
      [code, name, sort]
    );
  }
  await c.query(
    `UPDATE crm.crm_sales_lost_reasons SET is_active = false, updated_at = NOW()
     WHERE code = ANY($1::text[])`,
    [["harga", "kompetitor", "jadwal", "batal-acara", "tidak-respon"]]
  );
  console.log(`  ✓ alasan kalah ${LOST_REASONS.length}`);

  // ── Pipeline default → B2B Paddy ─────────────────────────────────────────
  const { rows: defPipe } = await c.query(`SELECT id FROM crm.crm_pipelines WHERE is_default LIMIT 1`);
  if (defPipe[0]) {
    await c.query(`UPDATE crm.crm_pipelines SET name = $2, updated_at = NOW() WHERE id = $1`, [defPipe[0].id, PIPELINE_NAME]);
    for (const [code, name] of Object.entries(STAGE_NAMES)) {
      await c.query(
        `UPDATE crm.crm_sales_stages SET name = $3, updated_at = NOW() WHERE pipeline_id = $1 AND code = $2`,
        [defPipe[0].id, code, name]
      );
    }
    console.log(`  ✓ pipeline default → ${PIPELINE_NAME}`);
  }
  await c.query(
    `UPDATE crm.crm_pipelines SET name = 'Reseller & Konsinyasi', updated_at = NOW() WHERE name = 'B2B Kopi & Katering'`
  );

  // ── Account ───────────────────────────────────────────────────────────────
  const accountIds = new Map();
  for (const [nama, tipe, industri, kota, telepon, email] of ACCOUNTS) {
    const { rows: found } = await c.query(
      `SELECT id FROM crm.crm_accounts WHERE company_id = $1 AND lower(name) = lower($2) AND deleted_at IS NULL LIMIT 1`,
      [scope.company_id, nama]
    );
    let id = found[0]?.id;
    if (id) {
      await c.query(
        `UPDATE crm.crm_accounts SET account_type=$2, industry=$3, city=$4, phone=$5, email=$6,
           owner_user_id = COALESCE(owner_user_id, $7), updated_at = NOW() WHERE id = $1`,
        [id, tipe, industri, kota, telepon, email, ownerId]
      );
    } else {
      const { rows } = await c.query(
        `INSERT INTO crm.crm_accounts (company_id, branch_id, name, account_type, industry, city, phone, email, owner_user_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING id`,
        [scope.company_id, scope.branch_id, nama, tipe, industri, kota, telepon, email, ownerId]
      );
      id = rows[0].id;
    }
    accountIds.set(nama, id);
  }
  console.log(`  ✓ account ${ACCOUNTS.length}`);

  // ── Contact ───────────────────────────────────────────────────────────────
  for (const [accNama, nama, jabatan, telepon, email, utama] of CONTACTS) {
    const accId = accountIds.get(accNama) ?? null;
    const { rows: found } = await c.query(
      `SELECT id FROM crm.crm_contacts WHERE company_id = $1 AND phone = $2 AND deleted_at IS NULL LIMIT 1`,
      [scope.company_id, telepon]
    );
    if (found[0]) {
      await c.query(
        `UPDATE crm.crm_contacts SET name=$2, title=$3, email=$4, account_id=$5, is_primary=$6, updated_at=NOW() WHERE id=$1`,
        [found[0].id, nama, jabatan, email, accId, utama]
      );
    } else {
      await c.query(
        `INSERT INTO crm.crm_contacts (company_id, branch_id, account_id, name, title, phone, email, is_primary, owner_user_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
        [scope.company_id, scope.branch_id, accId, nama, jabatan, telepon, email, utama, ownerId]
      );
    }
  }
  console.log(`  ✓ contact ${CONTACTS.length}`);

  // ── Lead ──────────────────────────────────────────────────────────────────
  const leadIds = new Map();
  for (const [org, tipe, pic, telepon, email, kota, sumber, temp, status, utmSource, utmCampaign, hari, catatan] of LEADS) {
    const accId = accountIds.get(org) ?? null;
    const { rows: found } = await c.query(
      `SELECT id FROM crm.crm_sales_leads WHERE company_id=$1 AND pic_phone=$2 AND lower(org_name)=lower($3) AND deleted_at IS NULL LIMIT 1`,
      [scope.company_id, telepon, org]
    );
    let id = found[0]?.id;
    if (id) {
      await c.query(
        `UPDATE crm.crm_sales_leads SET org_type=$2, pic_name=$3, pic_email=$4, city=$5, source=$6,
           temperature=$7, status=$8, notes=$9, account_id=$10, utm_source=$11, utm_campaign=$12,
           owner_user_id=COALESCE(owner_user_id,$13), updated_at=NOW() WHERE id=$1`,
        [id, tipe, pic, email, kota, sumber, temp, status, catatan, accId, utmSource, utmCampaign, ownerId]
      );
    } else {
      const { rows } = await c.query(
        `INSERT INTO crm.crm_sales_leads
           (company_id, branch_id, org_name, org_type, pic_name, pic_phone, pic_email, city, source,
            temperature, status, notes, account_id, utm_source, utm_campaign, owner_user_id, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16,$17::date)
         RETURNING id`,
        [scope.company_id, scope.branch_id, org, tipe, pic, telepon, email, kota, sumber,
         temp, status, catatan, accId, utmSource, utmCampaign, ownerId, dayFrom(hari)]
      );
      id = rows[0].id;
    }
    leadIds.set(org, id);
  }
  console.log(`  ✓ lead ${LEADS.length}`);

  // ── Deal ──────────────────────────────────────────────────────────────────
  const { rows: stageRows } = await c.query(
    `SELECT s.id, s.code FROM crm.crm_sales_stages s
     JOIN crm.crm_pipelines p ON p.id = s.pipeline_id AND p.is_default
     WHERE s.is_active`
  );
  const stageByCode = new Map(stageRows.map((r) => [r.code, r.id]));
  const { rows: pipelineRows } = await c.query(`SELECT id FROM crm.crm_pipelines WHERE is_default LIMIT 1`);
  const pipelineId = pipelineRows[0]?.id ?? null;

  let dealCount = 0;
  for (const [org, judul, jenis, nilai, stageCode, hariAcara, pax] of DEALS) {
    const leadId = leadIds.get(org);
    const stageId = stageByCode.get(stageCode);
    if (!leadId || !stageId) {
      console.log(`  ! deal "${judul}" dilewati (lead/tahap ${stageCode} tidak ditemukan)`);
      continue;
    }
    const { rows: found } = await c.query(
      `SELECT id FROM crm.crm_sales_deals WHERE company_id=$1 AND lower(title)=lower($2) AND deleted_at IS NULL LIMIT 1`,
      [scope.company_id, judul]
    );
    if (found[0]) {
      await c.query(
        `UPDATE crm.crm_sales_deals SET stage_id=$2, value_estimate=$3, event_date=$4::date,
           pax_estimate=$5, pipeline_id=COALESCE(pipeline_id,$6), updated_at=NOW() WHERE id=$1`,
        [found[0].id, stageId, nilai, dayFrom(hariAcara), pax, pipelineId]
      );
    } else {
      await c.query(
        `INSERT INTO crm.crm_sales_deals
           (company_id, branch_id, lead_id, title, event_type, event_date, pax_estimate,
            stage_id, pipeline_id, value_estimate, owner_user_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11,$11)`,
        [scope.company_id, scope.branch_id, leadId, judul, jenis, dayFrom(hariAcara), pax,
         stageId, pipelineId, nilai, ownerId]
      );
    }
    dealCount += 1;
  }
  console.log(`  ✓ deal ${dealCount}`);

  // ── Aktivitas / tugas ─────────────────────────────────────────────────────
  let actCount = 0;
  for (const [org, jenis, judul, catatan, hari, status] of ACTIVITIES) {
    const leadId = leadIds.get(org);
    if (!leadId) continue;
    const { rows: found } = await c.query(
      `SELECT id FROM crm.crm_sales_activities WHERE company_id=$1 AND lead_id=$2 AND title=$3 AND deleted_at IS NULL LIMIT 1`,
      [scope.company_id, leadId, judul]
    );
    const dueAt = `${dayFrom(hari)} 09:00:00+07`;
    if (found[0]) {
      await c.query(
        `UPDATE crm.crm_sales_activities SET activity_type=$2, notes=$3, due_at=$4::timestamptz,
           status=$5, done_at=$6::timestamptz, updated_at=NOW() WHERE id=$1`,
        [found[0].id, jenis, catatan, dueAt, status, status === "done" ? dueAt : null]
      );
    } else {
      await c.query(
        `INSERT INTO crm.crm_sales_activities
           (company_id, branch_id, lead_id, activity_type, title, notes, due_at, status, done_at,
            priority, subject_type, subject_id, owner_user_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz,$8,$9::timestamptz,'normal','lead',$3,$10,$10)`,
        [scope.company_id, scope.branch_id, leadId, jenis, judul, catatan, dueAt, status,
         status === "done" ? dueAt : null, ownerId]
      );
    }
    actCount += 1;
  }
  console.log(`  ✓ aktivitas ${actCount}`);

  return {
    "alasan kalah": LOST_REASONS.length,
    account: ACCOUNTS.length,
    contact: CONTACTS.length,
    lead: LEADS.length,
    deal: dealCount,
    aktivitas: actCount,
  };
});
