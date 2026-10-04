# EPIC-053: POS Mode Retail — Kasir Toko tanpa Elemen F&B — `MODULE-POS`

status: ready-for-qa
environment: dev
phase: 1
priority: P1
area: Fullstack
module: `MODULE-POS`
retries: 0

## Goal

Kasir Paddy (retail aksesoris) tidak memakai alur restoran. Owner (2026-10-04): hilangkan
menu/elemen F&B seperti Dine-in / Take Away dan sesuaikan POS untuk penjualan retail.

## Desain

| Bagian | Keputusan |
|---|---|
| Flag | `NEXT_PUBLIC_POS_MODE=retail` (build-time, `src/lib/pos/business-mode.ts`); default `fnb` — kode F&B tetap ada untuk instance lain |
| Kasir | tanpa tombol Dine-in/Take Away, jumlah tamu, label meja, TV Antrian, tombol "Order" (open bill dapur); panel "Keranjang" + tombol Pay; subjudul "Penjualan toko" |
| Data order | penjualan toko disimpan `order_type = takeaway` (laporan & integrasi lama tetap jalan); label "Penjualan toko" di daftar order & laporan |
| Pasca bayar | tanpa nomor antrian & tombol cetak Kitchen/Bar; toast "Pembayaran berhasil"; struk tanpa baris TAKEAWAY/ANTRIAN |
| Menu (seeder `paddy-retail-pos.js`) | dimatikan: KDS, Print Queue, TV Antrian, Restaurant, Tables, Reservasi, GoFood, POS Classic, Harga Channel; grup "Dapur & Cetak" → "Printer & Struk" |
| Metode bayar | NFC Tab (gelang venue) dimatikan; Credit Card → "Kartu Debit/Kredit" (EDC) |
| Stall | cabang satu stall (toko): akses "Semua Stall" dari penempatan Main Storage dimatikan → kasir terkunci di tokonya, tombol pindah stall tidak tampil |

## Automation Log

- 2026-10-04 — Verifikasi di https://paddy.reddie.id sebagai kasir.pvj: layar tanpa Dine-in / Take Away /
  tamu / TV Antrian / tombol Order; sidebar tanpa menu F&B; stall terkunci PVJ; dialog bayar tanpa NFC Tab;
  bayar tunai via UI → order `takeaway paid` di Paddy Store PVJ, stok PVJ −1; dialog sukses tanpa antrian &
  Kitchen/Bar. Super admin tetap bisa pindah stall. Transaksi uji dihapus, stok demo dipulihkan.
- 2026-10-04 — Gate: vitest 302 file / 2441 test lulus (termasuk test struk retail & resolver mode);
  tsc 508 = baseline; eslint error 27 = baseline pada file yang diubah.
