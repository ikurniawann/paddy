#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- seeder Node CommonJS, sama seperti seeder lain */
/**
 * Seeder demo Transfer Stok Toko (multi-toko, EPIC-052): tiga transfer dengan
 * status berbeda supaya halaman Transfer Stok Toko & kartu stok langsung berisi.
 *
 *   1. Gudang Pusat → Paddy Store PVJ           diterima 3 hari lalu (restock varian yang habis di PVJ)
 *   2. Gudang Pusat → Paddy Playstore Blok M    dalam pengiriman (dikirim kemarin)
 *   3. Playstore Gandapura → Lippo Mall Nusantara  draft
 *
 * Stok berpindah lewat fungsi SQL yang sama dengan aplikasi
 * (pos.pos_stock_transfer_send/receive). Idempoten: transfer demo lama
 * (catatan berawalan "DEMO") dibalik efek stoknya lalu dihapus sebelum dibuat ulang.
 * Prasyarat: paddy-structure, paddy-catalog (produk multi-toko).
 *
 * Usage:
 *   node database/seeders/paddy-demo-store-transfers.js
 *   npm run db:seed:paddy-store-transfers
 */

const { runSeeder, anyAdmin } = require("./lib/paddy-demo");

const DEMO_PREFIX = "DEMO";

/** [kode cabang asal, kode cabang tujuan, status akhir, hari lalu, catatan, pemilih varian] */
const TRANSFERS = [
  {
    from: "PADDY-HQ",
    to: "PADDY-BDG-PVJ",
    status: "received",
    daysAgo: 3,
    notes: `${DEMO_PREFIX} — Restock mingguan PVJ: varian yang habis di toko`,
    pick: { mode: "empty_at_destination", limit: 6, qty: 4 },
  },
  {
    from: "PADDY-HQ",
    to: "PADDY-JKT-BLOKM",
    status: "sent",
    daysAgo: 1,
    notes: `${DEMO_PREFIX} — Kiriman koleksi katalog baru untuk flagship Blok M (ekspedisi Bandung–Jakarta)`,
    pick: { mode: "category", category: "Catalogue Case", limit: 5, qty: 3 },
  },
  {
    from: "PADDY-BDG-GANDAPURA",
    to: "PADDY-JKT-LMN",
    status: "draft",
    daysAgo: 0,
    notes: `${DEMO_PREFIX} — Usulan pindah stok smartwatch ke Lippo Mall Nusantara`,
    pick: { mode: "category", category: "Paddy Watch", limit: 3, qty: 2 },
  },
];

async function stallOf(c, branchCode) {
  const { rows } = await c.query(
    `SELECT w.id, w.name FROM configuration.warehouses w
     JOIN configuration.branches b ON b.id = w.branch_id
     WHERE b.code = $1 AND w.is_active AND w.is_default LIMIT 1`,
    [branchCode]
  );
  if (!rows[0]) throw new Error(`Stall cabang ${branchCode} tidak ada — jalankan paddy-structure dulu`);
  return rows[0];
}

/** Balik efek stok transfer demo lama lalu hapus (beserta kartu stoknya). */
async function removeOldDemoTransfers(c) {
  const { rows: old } = await c.query(
    `SELECT id, status, from_warehouse_id, to_warehouse_id FROM pos.pos_stock_transfers
     WHERE notes LIKE $1`,
    [`${DEMO_PREFIX}%`]
  );
  for (const t of old) {
    const { rows: items } = await c.query(
      `SELECT sku_id, qty FROM pos.pos_stock_transfer_items WHERE transfer_id = $1`,
      [t.id]
    );
    await c.query(`SELECT set_config('pos.sku_stock_sync', 'on', true)`);
    for (const item of items) {
      if (t.status === "sent" || t.status === "received") {
        await c.query(
          `UPDATE pos.pos_sku_stock_locations SET stock_quantity = stock_quantity + $3
           WHERE sku_id = $1 AND warehouse_id = $2`,
          [item.sku_id, t.from_warehouse_id, item.qty]
        );
      }
      if (t.status === "received") {
        await c.query(
          `UPDATE pos.pos_sku_stock_locations SET stock_quantity = stock_quantity - $3
           WHERE sku_id = $1 AND warehouse_id = $2`,
          [item.sku_id, t.to_warehouse_id, item.qty]
        );
      }
    }
    for (const item of items) {
      await c.query(`SELECT pos.pos_sync_sku_total($1)`, [item.sku_id]);
    }
    await c.query(
      `DELETE FROM pos.pos_sku_stock_movements WHERE reference_type = 'stock_transfer' AND reference_id = $1`,
      [t.id]
    );
    await c.query(`DELETE FROM pos.pos_stock_transfers WHERE id = $1`, [t.id]);
  }
  return old.length;
}

async function pickSkus(c, pick, fromId, toId) {
  if (pick.mode === "empty_at_destination") {
    const { rows } = await c.query(
      `SELECT s.id, s.sku FROM pos.pos_sku_stock_locations dst
       JOIN pos.pos_sku_stock_locations src ON src.sku_id = dst.sku_id AND src.warehouse_id = $2
       JOIN pos.pos_product_skus s ON s.id = dst.sku_id AND s.is_active
       WHERE dst.warehouse_id = $1 AND dst.stock_quantity = 0 AND src.stock_quantity >= $3
       ORDER BY s.sku LIMIT $4`,
      [toId, fromId, pick.qty, pick.limit]
    );
    return rows;
  }
  const { rows } = await c.query(
    `SELECT s.id, s.sku FROM pos.pos_product_skus s
     JOIN pos.pos_products p ON p.id = s.product_id AND p.store_scope = 'all'
     JOIN pos.pos_categories cat ON cat.id = p.category_id AND cat.name = $3
     JOIN pos.pos_sku_stock_locations src ON src.sku_id = s.id AND src.warehouse_id = $1
     WHERE s.is_active AND src.stock_quantity >= $2
     ORDER BY s.sku LIMIT $4`,
    [fromId, pick.qty, pick.category, pick.limit]
  );
  return rows;
}

runSeeder("Seeding demo Transfer Stok Toko", async (c) => {
  const admin = await anyAdmin(c);
  const userId = admin?.id ?? null;
  const removed = await removeOldDemoTransfers(c);
  if (removed) console.log(`  ↺ ${removed} transfer demo lama dibalik & dihapus`);

  const summary = [];
  for (const def of TRANSFERS) {
    const from = await stallOf(c, def.from);
    const to = await stallOf(c, def.to);
    const skus = await pickSkus(c, def.pick, from.id, to.id);
    if (skus.length === 0) {
      console.log(`  ! ${from.name} → ${to.name}: tidak ada varian yang cocok, dilewati`);
      continue;
    }
    const at = `now() - interval '${def.daysAgo} days'`;
    const { rows } = await c.query(
      `INSERT INTO pos.pos_stock_transfers (transfer_no, from_warehouse_id, to_warehouse_id, notes, created_by, created_at)
       VALUES (pos.pos_next_stock_transfer_no(), $1, $2, $3, $4, ${at} - interval '2 hours')
       RETURNING id, transfer_no`,
      [from.id, to.id, def.notes, userId]
    );
    const transfer = rows[0];
    for (const sku of skus) {
      await c.query(
        `INSERT INTO pos.pos_stock_transfer_items (transfer_id, sku_id, qty) VALUES ($1, $2, $3)`,
        [transfer.id, sku.id, def.pick.qty]
      );
    }
    if (def.status === "sent" || def.status === "received") {
      await c.query(`SELECT pos.pos_stock_transfer_send($1, $2)`, [transfer.id, userId]);
      await c.query(
        `UPDATE pos.pos_stock_transfers SET sent_at = ${at} - interval '1 hour' WHERE id = $1`,
        [transfer.id]
      );
      await c.query(
        `UPDATE pos.pos_sku_stock_movements SET created_at = ${at} - interval '1 hour'
         WHERE reference_id = $1 AND movement_type = 'transfer_out'`,
        [transfer.id]
      );
    }
    if (def.status === "received") {
      await c.query(`SELECT pos.pos_stock_transfer_receive($1, $2)`, [transfer.id, userId]);
      await c.query(`UPDATE pos.pos_stock_transfers SET received_at = ${at} WHERE id = $1`, [transfer.id]);
      await c.query(
        `UPDATE pos.pos_sku_stock_movements SET created_at = ${at}
         WHERE reference_id = $1 AND movement_type = 'transfer_in'`,
        [transfer.id]
      );
    }
    summary.push(`${transfer.transfer_no} ${def.status}`);
    console.log(
      `  ✓ ${transfer.transfer_no} ${from.name} → ${to.name}: ${skus.length} varian × ${def.pick.qty} pcs [${def.status}]`
    );
  }

  const { rows: check } = await c.query(
    `SELECT count(*)::int AS n FROM pos.pos_product_skus s
     WHERE EXISTS (SELECT 1 FROM pos.pos_sku_stock_locations l WHERE l.sku_id = s.id)
       AND s.stock_quantity <> (SELECT COALESCE(SUM(l.stock_quantity), 0) FROM pos.pos_sku_stock_locations l WHERE l.sku_id = s.id)`
  );
  if (check[0].n > 0) throw new Error(`Total ${check[0].n} varian tidak sama dengan SUM stok lokasi`);

  return { transfer: summary.join(", ") };
});
