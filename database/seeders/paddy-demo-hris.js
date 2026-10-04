#!/usr/bin/env node
/**
 * Seeder demo HRIS Paddy: karyawan toko, e-commerce, workshop cetak; shift kerja; kontrak.
 *
 * Melengkapi hris-master-data.js (departemen/jabatan/status kepegawaian) yang
 * hanya mengisi master. Tanpa karyawan ber-departemen, modul lain ikut macet —
 * mis. Purchase Request wajib punya requester + department.
 *
 * Shift & kontrak kerja belum pernah punya seeder sama sekali; keduanya hanya
 * pernah DIHAPUS oleh reset dari xlsx.
 *
 * Idempotent: karyawan upsert per NIP, shift per nama, kontrak per nomor.
 *
 * Usage:
 *   node database/seeders/paddy-demo-hris.js
 *   npm run db:seed:paddy-hris
 */

const { dayFrom, runSeeder } = require("./lib/paddy-demo");

/** [nama, nip, email, telepon, departemen_code, jabatan, status, gender, kota, mulai_kerja_hari] */
const EMPLOYEES = [
  ["Rizky Ananda", "PDY-1001", "rizky.ananda@paddy.id", "081210001001", "RTL", "Store Manager", "permanent", "male", "Bandung", -900],
  ["Putri Maharani", "PDY-1002", "putri.maharani@paddy.id", "081210001002", "RTL", "Store Supervisor", "permanent", "female", "Bandung", -540],
  ["Salsa Ramadhani", "PDY-1003", "salsa.ramadhani@paddy.id", "081210001003", "RTL", "Store Cashier", "contract", "female", "Bandung", -300],
  ["Nadia Safitri", "PDY-1004", "nadia.safitri@paddy.id", "081210001004", "RTL", "Retail Associate", "contract", "female", "Cimahi", -240],
  ["Fajar Nugroho", "PDY-1005", "fajar.nugroho@paddy.id", "081210001005", "RTL", "Retail Associate", "probation", "male", "Kab. Bandung", -60],
  ["Tiara Wulandari", "PDY-1006", "tiara.wulandari@paddy.id", "081210001006", "ECOM", "E-Commerce Manager", "permanent", "female", "Bandung", -720],
  ["Bagas Pratama", "PDY-1007", "bagas.pratama@paddy.id", "081210001007", "ECOM", "Admin Marketplace", "contract", "male", "Bandung", -400],
  ["Aulia Rahma", "PDY-1008", "aulia.rahma@paddy.id", "081210001008", "ECOM", "Customer Service Online", "contract", "female", "Bandung", -200],
  ["Dimas Kurniawan", "PDY-1009", "dimas.kurniawan@paddy.id", "081210001009", "PRD", "Production Supervisor", "permanent", "male", "Kab. Bandung", -800],
  ["Kevin Halim", "PDY-1010", "kevin.halim@paddy.id", "081210001010", "PRD", "Graphic Designer", "permanent", "male", "Bandung", -480],
  ["Yoga Firmansyah", "PDY-1011", "yoga.firmansyah@paddy.id", "081210001011", "PRD", "Operator UV Printing", "contract", "male", "Kab. Bandung", -330],
  ["Rina Oktaviani", "PDY-1012", "rina.oktaviani@paddy.id", "081210001012", "WHL", "Packer", "contract", "female", "Kab. Bandung", -150],
  ["Ayu Lestari", "PDY-1013", "ayu.lestari@paddy.id", "081210001013", "PROC", "Purchasing Staff", "permanent", "female", "Bandung", -365],
  ["Hendra Saputra", "PDY-1014", "hendra.saputra@paddy.id", "081210001014", "FIN", "Accounting Supervisor", "permanent", "male", "Bandung", -600],
  ["Michelle Tan", "PDY-1015", "michelle.tan@paddy.id", "081210001015", "MKT", "Content Creator", "contract", "female", "Bandung", -180],
];

/** [nama, mulai, selesai, istirahat_menit, toleransi_menit, lintas_hari, urutan] — jam buka toko 10.00–21.00 */
const SHIFTS = [
  ["Toko Pagi", "09:30", "17:30", 60, 10, false, 1],
  ["Toko Sore", "13:30", "21:30", 60, 10, false, 2],
  ["Kantor & Workshop", "08:00", "17:00", 60, 10, false, 3],
  ["Packing Online", "09:00", "18:00", 60, 10, false, 4],
  ["Stock Opname Malam", "21:30", "01:30", 30, 15, true, 5],
];

runSeeder("Seeding demo HRIS", async (c, scope) => {
  void scope;

  // ── Shift kerja ───────────────────────────────────────────────────────────
  for (const [nama, mulai, selesai, istirahat, toleransi, lintas, urut] of SHIFTS) {
    const { rows } = await c.query(`SELECT id FROM hris.shifts WHERE lower(name) = lower($1) LIMIT 1`, [nama]);
    if (rows[0]) {
      await c.query(
        `UPDATE hris.shifts
         SET start_time = $2, end_time = $3, break_minutes = $4, late_tolerance_minutes = $5,
             is_overnight = $6, sort_order = $7, is_active = true, updated_at = NOW()
         WHERE id = $1`,
        [rows[0].id, mulai, selesai, istirahat, toleransi, lintas, urut]
      );
    } else {
      await c.query(
        `INSERT INTO hris.shifts
           (name, start_time, end_time, break_minutes, late_tolerance_minutes, is_overnight, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [nama, mulai, selesai, istirahat, toleransi, lintas, urut]
      );
    }
    console.log(`  ✓ shift ${nama} ${mulai}–${selesai}`);
  }

  // ── Karyawan ──────────────────────────────────────────────────────────────
  const { rows: deptRows } = await c.query(`SELECT id, code FROM hris.departments`);
  const deptByCode = new Map(deptRows.map((r) => [r.code, r.id]));
  const { rows: posRows } = await c.query(`SELECT id, title FROM hris.positions`);
  const posByTitle = new Map(posRows.map((r) => [r.title.toLowerCase(), r.id]));

  const employeeIds = new Map();
  for (const [nama, nip, email, phone, deptCode, jabatan, status, gender, kota, joinOffset] of EMPLOYEES) {
    const deptId = deptByCode.get(deptCode) ?? null;
    // Jabatan yang belum ada di master tidak dipaksakan — biar tidak menulis id palsu.
    const posId = posByTitle.get(jabatan.toLowerCase()) ?? null;
    const { rows } = await c.query(
      `INSERT INTO hris.employees
         (full_name, nip, email, phone, gender, city, join_date, employment_status,
          department_id, job_title_id, is_active, is_access_app)
       VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,true,false)
       ON CONFLICT (nip) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         gender = EXCLUDED.gender,
         city = EXCLUDED.city,
         join_date = EXCLUDED.join_date,
         employment_status = EXCLUDED.employment_status,
         department_id = EXCLUDED.department_id,
         job_title_id = COALESCE(EXCLUDED.job_title_id, hris.employees.job_title_id),
         is_active = true,
         updated_at = NOW()
       RETURNING id`,
      [nama, nip, email, phone, gender, kota, dayFrom(joinOffset), status, deptId, posId]
    );
    employeeIds.set(nip, rows[0].id);
    console.log(`  ✓ karyawan ${nip} — ${nama} (${jabatan}${posId ? "" : ", jabatan belum di master"})`);
  }

  // ── Kontrak kerja ─────────────────────────────────────────────────────────
  // Permanent = PKWTT tanpa tanggal berakhir; contract/probation = PKWT berjangka.
  let contractCount = 0;
  for (const [nama, nip, , , deptCode, jabatan, status, , , joinOffset] of EMPLOYEES) {
    const empId = employeeIds.get(nip);
    if (!empId) continue;
    // Constraint pkwt_no_probation menegakkan aturan ketenagakerjaan: masa
    // percobaan hanya sah pada PKWTT. Jadi karyawan berstatus probation tetap
    // PKWTT (dengan probation_end_date), bukan PKWT.
    const isPkwt = status === "contract";
    const type = isPkwt ? "pkwt" : "pkwtt"; // CHECK constraint memakai huruf kecil
    const endDate = isPkwt ? dayFrom(joinOffset + 365) : null;
    const probationEnd = status === "probation" ? dayFrom(joinOffset + 90) : null;
    const nomor = `DEMO-KTR-${nip}`;
    await c.query(
      `INSERT INTO hris.employment_contracts
         (employee_id, contract_number, contract_type, status, start_date, end_date,
          probation_end_date, sequence, position_title, department_name, work_location, notes)
       VALUES ($1,$2,$3,'active',$4::date,$5::date,$6::date,1,$7,$8,'Paddy Bandung',$9)
       ON CONFLICT (contract_number) DO UPDATE SET
         contract_type = EXCLUDED.contract_type,
         status = EXCLUDED.status,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         probation_end_date = EXCLUDED.probation_end_date,
         position_title = EXCLUDED.position_title,
         department_name = EXCLUDED.department_name,
         updated_at = NOW()`,
      [empId, nomor, type, dayFrom(joinOffset), endDate, probationEnd, jabatan, deptCode, `Kontrak demo ${nama}`]
    );
    contractCount += 1;
  }
  console.log(`  ✓ kontrak kerja ${contractCount} (PKWTT tanpa tanggal berakhir, PKWT 1 tahun)`);

  return { shift: SHIFTS.length, karyawan: EMPLOYEES.length, kontrak: contractCount };
});
