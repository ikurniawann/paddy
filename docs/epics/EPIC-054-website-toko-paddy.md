# EPIC-054: Website Toko Paddy — E-commerce Publik (Guest Checkout) — `MODULE-SHOP`

status: ready-for-qa
environment: dev
phase: 1
priority: P1
area: Fullstack
module: `MODULE-SHOP`
retries: 0

## Goal

Owner (2026-10-05): buatkan website e-commerce publik Paddy dengan desain mengikuti paddy.id —
beranda, daftar produk, detail produk, keranjang, checkout, dan seterusnya.

Keputusan owner:
- Subdomain sendiri: `shop-paddy.reddie.id`. ERP tidak bisa diakses lewat host toko.
- Pembayaran: transfer manual sekarang. Xendit otomatis aktif setelah `XENDIT_SECRET_KEY` diisi.
- Pengiriman: ambil di toko, plus ongkir flat per wilayah (zona provinsi).
- Tanpa login: guest checkout. Pelacakan pakai nomor pesanan + nomor WhatsApp.

## Desain

| Bagian | Keputusan |
|---|---|
| Routing | `src/proxy.ts`: host di `STORE_HOSTS` → rewrite `/x` → `/store/x` (header `x-store-base: ""`); `/api/*`, `/_next/*`, dan file statis tidak di-rewrite. Path `/store/*` di host ERP tetap bisa dipakai untuk pratinjau. |
| Halaman | `src/app/(store)/store/**`: beranda, `/shop`, `/product-category/[slug]`, `/catalogues/[slug]`, `/product/[slug]`, `/cart`, `/checkout`, `/order/[token]`, `/track-order`, `/wishlist`, halaman statis. Keranjang dan wishlist disimpan di localStorage. |
| Katalog | Data dari produk POS merchandise yang didistribusikan ke channel `web` dan punya `shop.web_listings` (slug, harga coret, new arrival). Kategori web dari `shop.web_categories`, koleksi/tema dari `shop.web_collections`. |
| Stok | Dikirim: dipotong dari Gudang Pusat (lokasi home). Ambil di toko: dipotong dari toko yang dipilih (`pos_sell_merchandise_sku_stock_at`). Reservasi menyimpan `warehouse_id`; reservasi kedaluwarsa dikembalikan ke lokasi asalnya. |
| Ongkir | `shop.flat_shipping_zones` (provinsi → tarif). Zona tanpa provinsi = zona sisa. Ambil di toko = Rp 0 (`shop.pickup_points`). |
| Pembayaran | Transfer manual: batas bayar 24 jam. Pembeli mengunggah bukti (privat, ≤5MB), lalu admin klik "Konfirmasi Transfer" → paid, reservasi di-commit, WA terkirim. Xendit (bila dikonfigurasi): batas 2 jam, webhook memakai `afterShopOrderPaid` yang sama. |
| Admin | Ecommerce → Pesanan: badge Website/metode bayar, lihat bukti transfer, Konfirmasi Transfer; ambil di toko: Tandai Disiapkan → Sudah Diambil; ongkir flat: input resi manual. |
| Pengaturan | `app_settings`: `shop_announcement`, `shop_bank_accounts` (JSON), `shop_whatsapp`, `shop_instagram`. |
| Seeder | `npm run db:seed:paddy-web-store`: listing 57 produk, 10 kategori, 9 koleksi, 7 zona flat (DEMO), 4 titik ambil. |

## Tasks

- [x] Migrasi `20261005100000_store_web_paddy.sql`, `20261005101000_store_pickup_points.sql`
- [x] Seeder `paddy-web-store.js` + aset `public/store/**`
- [x] Server katalog (`src/lib/store/catalog-server.ts`) + checkout (`checkout-server.ts`) + API publik `/api/public/store/*`
- [x] Rewrite host toko di proxy + test
- [x] Admin: konfirmasi transfer, bukti transfer, alur ambil di toko
- [x] UI storefront (desain paddy.id) — `src/app/(store)/store/**`, `src/features/store/**`
- [x] Deploy + DNS `shop-paddy.reddie.id` + E2E (ingress cloudflared: perintah sudo dijalankan owner)

## Batasan / To-do owner

- Isi rekening tujuan transfer (`shop_bank_accounts`; nomor rekening sengaja dibiarkan kosong) dan nomor WhatsApp toko (`shop_whatsapp`).
- Tarif ongkir flat masih DEMO. Sesuaikan di `shop.flat_shipping_zones`.
- Banner beranda masih statis di kode; belum ada UI pengaturan website di admin.
- Pembayaran online dan kurir otomatis butuh kunci Xendit / Biteship.

## Automation Log

- 2026-10-05 — UI storefront dibangun dengan desain paddy.id dan dicek di 1440px dan 390px: beranda (hero slider, value strip, featured tabs), listing dengan filter harga, sort, dan paginasi, PDP dengan pilihan varian 2 sumbu, keranjang, checkout, halaman pesanan dengan hitung mundur batas bayar dan unggah bukti, cek pesanan, wishlist, halaman statis, serta 404 bergaya toko.
- 2026-10-05 — E2E di container (host `shop-paddy.reddie.id`):
  - Semua route toko 200. `/dashboard` dan `/login` di host toko 404; ERP host tetap 200. Tidak ada tautan `/store` yang bocor.
  - Ambil di toko: stok Gandapura 5→4 saat checkout. Bukti diunggah; file non-gambar ditolak. Admin lihat bukti (200; tanpa sesi 401). Konfirmasi Transfer → paid dengan reservasi committed; konfirmasi kedua ditolak 409. Lalu Disiapkan → Sudah diambil.
  - Ongkir flat: DKI Jakarta Rp 18.000; Papua masuk zona sisa Rp 65.000. Stok Gudang Pusat 8→4. Batal admin → 6; reservasi kedaluwarsa (`release_expired_reservations`) → 8.
  - Label pesanan publik untuk ambil di toko diselaraskan dengan admin: Siap diambil → Sudah diambil, tanpa tahap "dikirim".
  - Data uji dihapus dan stok dipulihkan.
- 2026-10-05 — Gate: vitest 304 file / 2468+ test lulus (termasuk `src/lib/store/types.test.ts`, `src/features/store/lib/store-lib.test.ts`, `src/proxy.test.ts`); tsc 508 = baseline; brand check OK; eslint storefront 0 error.
- 2026-10-05 — Ingress cloudflared `shop-paddy.reddie.id` aktif (owner). Smoke test live: route toko 200, `/dashboard` dan `/login` 404 di host toko; browser headless: pencarian header → `/shop?q=nea`, tambah ke keranjang → keranjang → checkout (opsi ambil di toko tampil), 0 tautan `/store`, tanpa error console/halaman.
