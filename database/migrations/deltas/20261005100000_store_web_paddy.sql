-- ============================================================================
-- Website toko publik (EPIC-054): katalog web, kategori & koleksi, harga coret,
-- ongkir flat, ambil di toko, dan transfer manual — di atas modul shop EPIC-039.
--
-- Pesanan web memotong stok per lokasi (multi-toko, EPIC-052):
--   kirim (flat/kurir)  → lokasi utama produk (Gudang Pusat HQ)
--   ambil di toko       → stok toko yang dipilih
-- Lokasi disimpan di shop.orders.fulfillment_warehouse_id dan
-- shop.stock_reservations.warehouse_id supaya pelepasan reservasi
-- mengembalikan stok ke tempat yang sama.
-- ============================================================================

-- 1. Listing web per produk -----------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.web_listings (
  product_id       uuid PRIMARY KEY REFERENCES pos.pos_products(id) ON DELETE CASCADE,
  slug             text NOT NULL UNIQUE,
  compare_at_price numeric CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  is_new_arrival   boolean NOT NULL DEFAULT false,
  sort_order       integer NOT NULL DEFAULT 0,
  seo_title        text,
  seo_description  text,
  published_at     timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN shop.web_listings.compare_at_price IS 'Harga coret (sebelum diskon) di website';

-- 2. Kategori web (= kategori POS) & koleksi (Catalogues, Best Seller) ---------
CREATE TABLE IF NOT EXISTS shop.web_categories (
  pos_category_id uuid PRIMARY KEY REFERENCES pos.pos_categories(id) ON DELETE CASCADE,
  slug            text NOT NULL UNIQUE,
  title           text,
  description     text,
  banner_url      text,
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop.web_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  banner_url  text,
  nav_group   text NOT NULL DEFAULT 'catalogues' CHECK (nav_group IN ('catalogues', 'featured', 'hidden')),
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop.web_collection_products (
  collection_id uuid NOT NULL REFERENCES shop.web_collections(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES pos.pos_products(id) ON DELETE CASCADE,
  sort_order    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_web_collection_products_product
  ON shop.web_collection_products (product_id);

-- 3. Ongkir flat per wilayah (fallback sampai kurir realtime aktif) -----------
CREATE TABLE IF NOT EXISTS shop.flat_shipping_zones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  provinces  text[] NOT NULL DEFAULT '{}',
  price      numeric NOT NULL CHECK (price >= 0),
  eta_label  text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN shop.flat_shipping_zones.provinces IS 'Nama provinsi tujuan; kosong = zona sisa (berlaku untuk provinsi lain)';

-- 4. Pesanan: metode bayar & kirim, lokasi pemenuhan, bukti transfer ----------
ALTER TABLE shop.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'xendit',
  ADD COLUMN IF NOT EXISTS shipping_method text NOT NULL DEFAULT 'courier',
  ADD COLUMN IF NOT EXISTS fulfillment_warehouse_id uuid REFERENCES configuration.warehouses(id),
  ADD COLUMN IF NOT EXISTS destination_province text,
  ADD COLUMN IF NOT EXISTS destination_city text,
  ADD COLUMN IF NOT EXISTS payment_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check') THEN
    ALTER TABLE shop.orders ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IN ('xendit', 'manual_transfer'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_shipping_method_check') THEN
    ALTER TABLE shop.orders ADD CONSTRAINT orders_shipping_method_check
      CHECK (shipping_method IN ('courier', 'flat', 'pickup'));
  END IF;
END $$;

ALTER TABLE shop.stock_reservations
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES configuration.warehouses(id);

-- 5. Pelepasan reservasi kedaluwarsa → stok kembali ke lokasi asal klaim ------
CREATE OR REPLACE FUNCTION shop.release_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_row record;
  v_count integer := 0;
BEGIN
  FOR v_row IN
    -- FOR UPDATE SKIP LOCKED: dua request bersamaan tidak merilis dobel
    SELECT id, order_id, product_id, sku_id, qty, warehouse_id
    FROM shop.stock_reservations
    WHERE status = 'held' AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE shop.stock_reservations
    SET status = 'released', updated_at = now()
    WHERE id = v_row.id AND status = 'held';

    IF NOT FOUND THEN CONTINUE; END IF;

    IF v_row.sku_id IS NOT NULL THEN
      -- *_at: varian multi-toko → lokasi klaim (NULL = lokasi utama); varian biasa → stok global.
      PERFORM public.pos_sell_merchandise_sku_stock_at(v_row.sku_id, v_row.warehouse_id, -v_row.qty);
    ELSE
      PERFORM public.pos_sell_merchandise_stock(v_row.product_id, -v_row.qty);
    END IF;

    UPDATE shop.orders
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_row.order_id AND status = 'pending';

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;
