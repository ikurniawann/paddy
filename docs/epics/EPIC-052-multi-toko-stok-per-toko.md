# EPIC-052: Multi-Toko — Stok per Toko & Transfer Stok (Paddy retail) — `MODULE-POS`

status: ready-for-qa
environment: dev
phase: 1
priority: P1
area: Fullstack
module: `MODULE-POS`
retries: 0

## Goal

Paddy (retail aksesoris custom) punya banyak toko offline — HQ + gudang di Kopo,
flagship Gandapura & Blok M, toko mall PVJ & Lippo Mall Nusantara. Satu produk dan
satu barcode harus bisa dijual di semua toko, dengan **stok terpisah per toko** dan
**transfer stok** antar lokasi. Sebelumnya (model food court warisan) satu produk POS
terikat ke satu stall dan stok varian bersifat global.

## Keputusan owner (2026-10-04)

- Kembangkan fitur multi-toko (bukan duplikasi katalog per toko — barcode harus
  seragam di semua toko).
- Struktur bisnis memakai 5 lokasi terkonfirmasi publik; toko baru cukup ditambah di
  `database/seeders/paddy-business-structure.js` (`LOCATIONS`).

## Desain

| Bagian | Keputusan |
|---|---|
| Mode produk | `pos_products.store_scope` = `stall` (lama) \| `all` (semua toko) |
| Stok | `pos.pos_sku_stock_locations` (varian × stall); `pos_product_skus.stock_quantity` tetap = SUM semua lokasi (dijaga fungsi SQL) |
| Kartu stok | `pos.pos_sku_stock_movements` (initial, sale, sale_restore, receive, transfer_out/in/cancel, adjustment) |
| Lokasi utama | stall katalog induk (`item.products.warehouse_id`) = Gudang Pusat HQ |
| Jalur lama | trigger `trg_pos_route_sku_total_write`: penulisan langsung ke stok total (GRN, opname, koreksi master, produksi) diarahkan ke lokasi utama; `pos_sell_merchandise_sku_stock` (toko online, marketplace, reservasi) memotong lokasi utama |
| Kasir | produk `all` muncul di katalog setiap stall; stall-nya = toko jual aktif; stok varian di katalog = stok toko aktif; klaim lewat `pos_sell_merchandise_sku_stock_at(sku, toko, qty)` |
| Semua Stall / kasir pusat | produk `all` tidak bisa dijual tanpa toko aktif (pesan: pilih toko aktif) |
| Transfer | `pos.pos_stock_transfers` draft → sent (stok keluar asal, dijaga tidak minus) → received (stok masuk tujuan); batal setelah kirim = stok kembali |
| UI | POS → Produk & Stok → **Stok per Toko** (matriks varian × lokasi, koreksi, kartu stok) & **Transfer Stok Toko**; dialog Pengaturan Merchandise: toggle "Jual di semua toko" |
| Peringatan stok | Stok Alert menampilkan varian yang menipis/habis per toko |

## Tasks

- [x] Migrasi `20261004120000_pos_multi_store_stock.sql` (tabel, fungsi, trigger)
- [x] Migrasi `20261004121000_pos_store_stock_menus.sql` (menu IAM + grant; kode didaftarkan di `iam-menus.sql`)
- [x] Order langsung, open bill (QRIS), checkout gabungan, batal/void: klaim & restore per toko
- [x] Katalog kasir & master produk (`store_scope`, stok toko aktif)
- [x] API `/api/pos/store-stock`, `/api/pos/store-stock/movements`, `/api/pos/stock-transfers[/id]`
- [x] Halaman Stok per Toko & Transfer Stok Toko
- [x] Seeder: struktur bisnis Paddy + katalog multi-toko dengan sebaran stok per lokasi
- [x] Seeder demo transfer (diterima / dalam pengiriman / draft), idempoten
- [ ] Akun kasir per toko (opsional, menunggu keputusan owner)
- [ ] GRN langsung ke toko (saat ini GRN multi-toko masuk ke Gudang Pusat)

## Acceptance Criteria

- Given produk multi-toko dan kasir aktif di PVJ, when menjual 2 pcs, then stok PVJ turun 2 dan stok toko lain tetap.
- Given stok PVJ 1, when kasir PVJ menjual 3, then transaksi ditolak dengan pesan sisa stok toko.
- Given transfer HQ → PVJ 2 pcs dikirim lalu diterima, then HQ −2, PVJ +2, total varian tetap, kartu stok mencatat TRF-….
- Given transfer melebihi stok asal, when dikirim, then ditolak dan stok tidak berubah.
- Total varian (`stock_quantity`) selalu = SUM stok semua lokasi.

## Automation Log

- 2026-10-04 — Skenario SQL (transaksi di-rollback) lulus: koreksi PVJ, jual 2, jual 10 ditolak
  (`insufficient_stock`, sisa 3), restore 1, jual online → HQ, GRN → HQ, update total lama → HQ,
  transfer HQ→PVJ kirim/terima, transfer 99 ditolak, varian non-multi-toko tetap global;
  total = SUM lokasi di setiap langkah.
- 2026-10-04 — Ditemukan & diperbaiki saat implementasi: open bill (dipakai kasir untuk QRIS)
  sebelumnya tidak menyimpan `sku_id` dan tidak memotong stok merchandise sama sekali.
- 2026-10-04 — Dialog Pengaturan Merchandise tidak lagi mengirim stok total untuk produk
  multi-toko (total basi akan tercatat sebagai koreksi palsu di lokasi utama).
- 2026-10-04 — E2E API di app terdeploy (paddy-app, build terbaru) — 26/26 PASS: katalog PVJ berisi 57
  produk dengan stall = PVJ dan stok varian = stok PVJ; jual 1 di PVJ (PVJ 4→3, Blok M & HQ tetap);
  jual melebihi stok ditolak "Stok Paddywatch Nea di toko ini tinggal 3 …"; batal → PVJ kembali 4;
  katalog Blok M menampilkan stok Blok M; transfer HQ→PVJ kirim (HQ −3) lalu terima (PVJ +3);
  transfer diterima tidak bisa dibatalkan; transfer 999 ditolak; kartu stok PVJ
  transfer_in/sale_restore/sale/initial; total = SUM lokasi untuk semua varian; mode Semua Stall
  menolak jual produk multi-toko. Data uji dibersihkan, stok seed dipulihkan.
- 2026-10-04 — Gate: vitest 300 file / 2433 test lulus; tsc 508 error = baseline (0 baru);
  check-no-hardcoded-brand OK; eslint bersih pada file baru.
