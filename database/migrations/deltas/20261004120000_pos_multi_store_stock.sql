-- ============================================================================
-- Multi-toko: produk merchandise dijual di semua toko dengan stok per toko.
--
-- Sebelumnya satu produk POS terikat ke satu stall (source_product_id →
-- item.products.warehouse_id) dan stok varian (pos_product_skus.stock_quantity)
-- bersifat global. Retail berjaringan (Paddy: HQ + flagship + toko mall) butuh
-- satu produk / satu barcode di semua toko, stok terpisah per toko, dan
-- transfer stok antar lokasi.
--
-- Model:
--   pos_products.store_scope      'stall' (perilaku lama) | 'all' (dijual di semua toko)
--   pos_sku_stock_locations       stok per varian × stall (configuration.warehouses)
--   pos_sku_stock_movements       kartu stok per lokasi
--   pos_stock_transfers(+_items)  transfer antar lokasi: draft → sent → received
--
-- Kompatibilitas: pos_product_skus.stock_quantity tetap ada dan selalu = SUM
-- stok semua lokasi (trigger), jadi layar/laporan lama tetap benar. Penulisan
-- lama yang langsung mengubah stock_quantity (GRN, opname, koreksi master,
-- hasil produksi) otomatis diarahkan ke "lokasi utama" produk = stall katalog
-- induknya (item.products.warehouse_id; Paddy: Gudang Pusat HQ). Penjualan
-- tanpa konteks toko (toko online, marketplace) juga memotong lokasi utama.
-- ============================================================================

-- 1. Mode toko produk ----------------------------------------------------------
ALTER TABLE pos.pos_products
  ADD COLUMN IF NOT EXISTS store_scope text NOT NULL DEFAULT 'stall';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_products_store_scope_check'
  ) THEN
    ALTER TABLE pos.pos_products
      ADD CONSTRAINT pos_products_store_scope_check CHECK (store_scope IN ('stall', 'all'));
  END IF;
END $$;

COMMENT ON COLUMN pos.pos_products.store_scope IS
  'stall = dijual di stall katalog induk saja; all = dijual di semua toko, stok per lokasi di pos_sku_stock_locations';

-- 2. Stok per lokasi & kartu stok ----------------------------------------------
CREATE TABLE IF NOT EXISTS pos.pos_sku_stock_locations (
  sku_id         uuid NOT NULL REFERENCES pos.pos_product_skus(id) ON DELETE CASCADE,
  warehouse_id   uuid NOT NULL REFERENCES configuration.warehouses(id) ON DELETE CASCADE,
  stock_quantity numeric NOT NULL DEFAULT 0,
  min_stock      numeric NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_pos_sku_stock_locations_warehouse
  ON pos.pos_sku_stock_locations (warehouse_id);

CREATE TABLE IF NOT EXISTS pos.pos_sku_stock_movements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id         uuid NOT NULL REFERENCES pos.pos_product_skus(id) ON DELETE CASCADE,
  warehouse_id   uuid NOT NULL REFERENCES configuration.warehouses(id) ON DELETE CASCADE,
  movement_type  text NOT NULL CHECK (movement_type IN (
                   'initial', 'sale', 'sale_restore', 'receive',
                   'transfer_out', 'transfer_in', 'transfer_cancel', 'adjustment')),
  qty_change     numeric NOT NULL,
  qty_after      numeric NOT NULL,
  reference_type text,
  reference_id   uuid,
  reference_no   text,
  note           text,
  created_by     uuid,
  -- clock_timestamp: urutan kartu stok tetap benar untuk mutasi dalam satu transaksi.
  created_at     timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE pos.pos_sku_stock_movements ALTER COLUMN created_at SET DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_pos_sku_stock_movements_sku_wh
  ON pos.pos_sku_stock_movements (sku_id, warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sku_stock_movements_wh
  ON pos.pos_sku_stock_movements (warehouse_id, created_at DESC);

-- 3. Helper ---------------------------------------------------------------------

-- Lokasi utama produk: stall katalog induk (item.products.warehouse_id).
CREATE OR REPLACE FUNCTION pos.pos_product_home_warehouse(p_product_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT p.warehouse_id
  FROM pos.pos_products pp
  JOIN item.products p ON p.id = pp.source_product_id AND p.deleted_at IS NULL
  WHERE pp.id = p_product_id
$$;

CREATE OR REPLACE FUNCTION pos.pos_sku_home_warehouse(p_sku_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_wh uuid;
BEGIN
  SELECT pos.pos_product_home_warehouse(s.product_id) INTO v_wh
  FROM pos.pos_product_skus s WHERE s.id = p_sku_id;
  IF v_wh IS NULL THEN
    -- Produk tanpa katalog induk: lokasi dengan stok terbanyak.
    SELECT l.warehouse_id INTO v_wh
    FROM pos.pos_sku_stock_locations l
    WHERE l.sku_id = p_sku_id
    ORDER BY l.stock_quantity DESC, l.warehouse_id
    LIMIT 1;
  END IF;
  RETURN v_wh;
END;
$$;

CREATE OR REPLACE FUNCTION pos.pos_sku_has_locations(p_sku_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM pos.pos_sku_stock_locations WHERE sku_id = p_sku_id)
$$;

CREATE OR REPLACE FUNCTION pos.pos_sku_allows_negative(p_sku_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT st.allow_negative_stock
     FROM pos.pos_product_skus s
     JOIN pos.pos_inventory_settings st ON st.product_id = s.product_id
     WHERE s.id = p_sku_id),
    true
  )
$$;

-- Hitung ulang total varian dari semua lokasi. Flag sesi mencegah trigger
-- routing (langkah 4) menganggap pembaruan ini sebagai penulisan lama.
CREATE OR REPLACE FUNCTION pos.pos_sync_sku_total(p_sku_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('pos.sku_stock_sync', 'on', true);
  UPDATE pos.pos_product_skus s
  SET stock_quantity = COALESCE(
        (SELECT SUM(l.stock_quantity) FROM pos.pos_sku_stock_locations l WHERE l.sku_id = s.id), 0),
      updated_at = now()
  WHERE s.id = p_sku_id;
  PERFORM set_config('pos.sku_stock_sync', 'off', true);
END;
$$;

-- Inti semua mutasi stok lokasi: ubah stok satu varian di satu lokasi,
-- catat kartu stok, sinkronkan total. p_guard = tolak bila stok tidak cukup
-- (kecuali produk mengizinkan stok minus).
CREATE OR REPLACE FUNCTION pos.pos_apply_sku_location_delta(
  p_sku_id        uuid,
  p_warehouse_id  uuid,
  p_delta         numeric,
  p_type          text,
  p_guard         boolean DEFAULT false,
  p_ref_type      text DEFAULT NULL,
  p_ref_id        uuid DEFAULT NULL,
  p_ref_no        text DEFAULT NULL,
  p_note          text DEFAULT NULL,
  p_user          uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_after numeric;
  v_before numeric;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;
  IF p_warehouse_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_location');
  END IF;

  INSERT INTO pos.pos_sku_stock_locations (sku_id, warehouse_id, stock_quantity)
  VALUES (p_sku_id, p_warehouse_id, 0)
  ON CONFLICT (sku_id, warehouse_id) DO NOTHING;

  SELECT stock_quantity INTO v_before
  FROM pos.pos_sku_stock_locations
  WHERE sku_id = p_sku_id AND warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF p_delta < 0 AND p_guard
     AND v_before + p_delta < 0
     AND NOT pos.pos_sku_allows_negative(p_sku_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_stock',
                              'quantity_available', v_before);
  END IF;

  UPDATE pos.pos_sku_stock_locations
  SET stock_quantity = stock_quantity + p_delta,
      updated_at = now()
  WHERE sku_id = p_sku_id AND warehouse_id = p_warehouse_id
  RETURNING stock_quantity INTO v_after;

  INSERT INTO pos.pos_sku_stock_movements
    (sku_id, warehouse_id, movement_type, qty_change, qty_after,
     reference_type, reference_id, reference_no, note, created_by)
  VALUES
    (p_sku_id, p_warehouse_id, p_type, p_delta, v_after,
     p_ref_type, p_ref_id, p_ref_no, p_note, p_user);

  PERFORM pos.pos_sync_sku_total(p_sku_id);

  RETURN jsonb_build_object('success', true, 'quantity_after', v_after);
END;
$$;

-- 4. Penulisan lama ke stock_quantity → lokasi utama ---------------------------
CREATE OR REPLACE FUNCTION pos.pos_route_sku_total_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_home uuid;
  v_delta numeric;
  v_reason text;
BEGIN
  IF current_setting('pos.sku_stock_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.stock_quantity IS NOT DISTINCT FROM OLD.stock_quantity
     OR NOT pos.pos_sku_has_locations(NEW.id) THEN
    RETURN NEW;
  END IF;

  v_delta := COALESCE(NEW.stock_quantity, 0) - COALESCE(OLD.stock_quantity, 0);
  v_home := pos.pos_sku_home_warehouse(NEW.id);
  IF v_home IS NULL THEN
    RAISE EXCEPTION 'Varian % multi-toko tidak punya lokasi utama', NEW.sku;
  END IF;
  v_reason := COALESCE(NULLIF(current_setting('pos.sku_stock_reason', true), ''), 'adjustment');

  -- Ubah lokasi utama tanpa memicu sinkron total (baris ini sedang di-update).
  PERFORM set_config('pos.sku_stock_sync', 'on', true);
  INSERT INTO pos.pos_sku_stock_locations (sku_id, warehouse_id, stock_quantity)
  VALUES (NEW.id, v_home, v_delta)
  ON CONFLICT (sku_id, warehouse_id)
  DO UPDATE SET stock_quantity = pos.pos_sku_stock_locations.stock_quantity + EXCLUDED.stock_quantity,
                updated_at = now();
  PERFORM set_config('pos.sku_stock_sync', 'off', true);

  INSERT INTO pos.pos_sku_stock_movements
    (sku_id, warehouse_id, movement_type, qty_change, qty_after, note)
  SELECT NEW.id, v_home, v_reason, v_delta, l.stock_quantity,
         'Perubahan stok total diarahkan ke lokasi utama'
  FROM pos.pos_sku_stock_locations l
  WHERE l.sku_id = NEW.id AND l.warehouse_id = v_home;

  NEW.stock_quantity := COALESCE(
    (SELECT SUM(stock_quantity) FROM pos.pos_sku_stock_locations WHERE sku_id = NEW.id), 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pos_route_sku_total_write ON pos.pos_product_skus;
CREATE TRIGGER trg_pos_route_sku_total_write
  BEFORE UPDATE OF stock_quantity ON pos.pos_product_skus
  FOR EACH ROW EXECUTE FUNCTION pos.pos_route_sku_total_write();

-- Varian baru pada produk multi-toko langsung punya baris lokasi utama.
CREATE OR REPLACE FUNCTION pos.pos_init_sku_location()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_home uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pos.pos_products WHERE id = NEW.product_id AND store_scope = 'all'
  ) THEN
    RETURN NEW;
  END IF;
  v_home := pos.pos_product_home_warehouse(NEW.product_id);
  IF v_home IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM set_config('pos.sku_stock_sync', 'on', true);
  INSERT INTO pos.pos_sku_stock_locations (sku_id, warehouse_id, stock_quantity)
  VALUES (NEW.id, v_home, COALESCE(NEW.stock_quantity, 0))
  ON CONFLICT (sku_id, warehouse_id) DO NOTHING;
  PERFORM set_config('pos.sku_stock_sync', 'off', true);
  IF COALESCE(NEW.stock_quantity, 0) <> 0 THEN
    INSERT INTO pos.pos_sku_stock_movements
      (sku_id, warehouse_id, movement_type, qty_change, qty_after, note)
    VALUES (NEW.id, v_home, 'initial', NEW.stock_quantity, NEW.stock_quantity, 'Stok awal varian baru');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pos_init_sku_location ON pos.pos_product_skus;
CREATE TRIGGER trg_pos_init_sku_location
  AFTER INSERT ON pos.pos_product_skus
  FOR EACH ROW EXECUTE FUNCTION pos.pos_init_sku_location();

-- 5. Aktif/nonaktif multi-toko --------------------------------------------------
-- Aktifkan: stok varian yang ada sekarang menjadi stok lokasi utama.
CREATE OR REPLACE FUNCTION pos.pos_enable_multi_store(p_product_id uuid, p_user uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_home uuid;
  v_count integer := 0;
  r record;
BEGIN
  v_home := pos.pos_product_home_warehouse(p_product_id);
  IF v_home IS NULL THEN
    RAISE EXCEPTION 'Produk belum punya katalog induk (stall) — tautkan dulu sebelum dijual di semua toko';
  END IF;

  UPDATE pos.pos_products SET store_scope = 'all', updated_at = now() WHERE id = p_product_id;

  FOR r IN
    SELECT s.id, COALESCE(s.stock_quantity, 0) AS qty
    FROM pos.pos_product_skus s
    WHERE s.product_id = p_product_id
      AND NOT EXISTS (SELECT 1 FROM pos.pos_sku_stock_locations l WHERE l.sku_id = s.id)
  LOOP
    PERFORM set_config('pos.sku_stock_sync', 'on', true);
    INSERT INTO pos.pos_sku_stock_locations (sku_id, warehouse_id, stock_quantity)
    VALUES (r.id, v_home, r.qty);
    PERFORM set_config('pos.sku_stock_sync', 'off', true);
    IF r.qty <> 0 THEN
      INSERT INTO pos.pos_sku_stock_movements
        (sku_id, warehouse_id, movement_type, qty_change, qty_after, note, created_by)
      VALUES (r.id, v_home, 'initial', r.qty, r.qty, 'Aktifkan multi-toko: stok awal di lokasi utama', p_user);
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Nonaktifkan: stok semua toko digabung kembali menjadi stok global varian.
CREATE OR REPLACE FUNCTION pos.pos_disable_multi_store(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE pos.pos_products SET store_scope = 'stall', updated_at = now() WHERE id = p_product_id;
  PERFORM set_config('pos.sku_stock_sync', 'on', true);
  DELETE FROM pos.pos_sku_stock_locations l
  USING pos.pos_product_skus s
  WHERE l.sku_id = s.id AND s.product_id = p_product_id;
  PERFORM set_config('pos.sku_stock_sync', 'off', true);
END;
$$;

-- 6. Jual / terima stok -----------------------------------------------------------
-- Badan lama fungsi jual (stok global) dipindah ke *_global.
CREATE OR REPLACE FUNCTION public.pos_sell_merchandise_sku_stock_global(p_sku_id uuid, p_qty numeric)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
BEGIN
  IF p_qty IS NULL OR p_qty = 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;

  IF p_qty < 0 THEN
    UPDATE pos.pos_product_skus
    SET stock_quantity = COALESCE(stock_quantity, 0) - p_qty,
        updated_at = now()
    WHERE id = p_sku_id
    RETURNING id, stock_quantity INTO v_row;

    RETURN jsonb_build_object(
      'success', v_row.id IS NOT NULL,
      'restored', true,
      'quantity_after', v_row.stock_quantity
    );
  END IF;

  UPDATE pos.pos_product_skus s
  SET stock_quantity = COALESCE(s.stock_quantity, 0) - p_qty,
      updated_at = now()
  WHERE s.id = p_sku_id
    AND s.is_active = true
    AND (
      COALESCE(s.stock_quantity, 0) >= p_qty
      OR COALESCE(
        (SELECT st.allow_negative_stock
         FROM pos.pos_inventory_settings st
         WHERE st.product_id = s.product_id),
        true
      )
    )
  RETURNING s.id, s.stock_quantity INTO v_row;

  IF v_row.id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM pos.pos_product_skus WHERE id = p_sku_id AND is_active = true
    ) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'insufficient_stock');
    END IF;
    RETURN jsonb_build_object('success', false, 'reason', 'sku_not_found');
  END IF;

  RETURN jsonb_build_object('success', true, 'quantity_after', v_row.stock_quantity);
END;
$$;

-- Jual/restore varian di satu toko. Varian tanpa stok lokasi (produk stall)
-- tetap memakai stok global, jadi aman dipanggil untuk produk apa pun.
CREATE OR REPLACE FUNCTION public.pos_sell_merchandise_sku_stock_at(
  p_sku_id uuid,
  p_warehouse_id uuid,
  p_qty numeric,
  p_ref_id uuid DEFAULT NULL,
  p_ref_no text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_wh uuid;
  v_res jsonb;
BEGIN
  IF p_qty IS NULL OR p_qty = 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;
  IF NOT pos.pos_sku_has_locations(p_sku_id) THEN
    RETURN public.pos_sell_merchandise_sku_stock_global(p_sku_id, p_qty);
  END IF;
  IF p_qty > 0 AND NOT EXISTS (
    SELECT 1 FROM pos.pos_product_skus WHERE id = p_sku_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'sku_not_found');
  END IF;

  v_wh := COALESCE(p_warehouse_id, pos.pos_sku_home_warehouse(p_sku_id));
  v_res := pos.pos_apply_sku_location_delta(
    p_sku_id, v_wh, -p_qty,
    CASE WHEN p_qty > 0 THEN 'sale' ELSE 'sale_restore' END,
    p_qty > 0, 'pos_order', p_ref_id, p_ref_no, NULL, NULL);

  IF p_qty < 0 THEN
    v_res := v_res || jsonb_build_object('restored', true);
  END IF;
  RETURN v_res;
END;
$$;

-- Nama lama (toko online, marketplace, reservasi): tanpa konteks toko →
-- varian multi-toko memotong lokasi utama, varian biasa tetap global.
CREATE OR REPLACE FUNCTION public.pos_sell_merchandise_sku_stock(p_sku_id uuid, p_qty numeric)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  IF pos.pos_sku_has_locations(p_sku_id) THEN
    RETURN public.pos_sell_merchandise_sku_stock_at(p_sku_id, NULL, p_qty);
  END IF;
  RETURN public.pos_sell_merchandise_sku_stock_global(p_sku_id, p_qty);
END;
$$;

-- Penerimaan barang (GRN) varian multi-toko masuk ke lokasi utama.
CREATE OR REPLACE FUNCTION public.pos_receive_merchandise_sku_stock(p_sku_id uuid, p_qty numeric)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN 0;
  END IF;

  IF pos.pos_sku_has_locations(p_sku_id) THEN
    IF NOT EXISTS (SELECT 1 FROM pos.pos_product_skus WHERE id = p_sku_id AND is_active = true) THEN
      RETURN 0;
    END IF;
    PERFORM pos.pos_apply_sku_location_delta(
      p_sku_id, pos.pos_sku_home_warehouse(p_sku_id), p_qty, 'receive', false,
      'grn', NULL, NULL, 'Penerimaan barang (GRN)', NULL);
    RETURN 1;
  END IF;

  UPDATE pos.pos_product_skus
  SET stock_quantity = COALESCE(stock_quantity, 0) + p_qty,
      updated_at = now()
  WHERE id = p_sku_id
    AND is_active = true;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Koreksi stok absolut satu varian di satu toko (stock opname per toko).
CREATE OR REPLACE FUNCTION pos.pos_set_sku_location_stock(
  p_sku_id uuid,
  p_warehouse_id uuid,
  p_qty numeric,
  p_user uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current numeric;
BEGIN
  IF p_qty IS NULL OR p_qty < 0 THEN
    RAISE EXCEPTION 'Stok tidak boleh negatif';
  END IF;
  IF NOT pos.pos_sku_has_locations(p_sku_id) THEN
    RAISE EXCEPTION 'Varian ini bukan produk multi-toko';
  END IF;
  SELECT COALESCE(stock_quantity, 0) INTO v_current
  FROM pos.pos_sku_stock_locations
  WHERE sku_id = p_sku_id AND warehouse_id = p_warehouse_id;
  RETURN pos.pos_apply_sku_location_delta(
    p_sku_id, p_warehouse_id, p_qty - COALESCE(v_current, 0), 'adjustment', false,
    'manual', NULL, NULL, COALESCE(NULLIF(p_note, ''), 'Koreksi stok toko'), p_user);
END;
$$;

-- 7. Transfer stok antar lokasi ---------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS pos.pos_stock_transfer_seq;

CREATE TABLE IF NOT EXISTS pos.pos_stock_transfers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no       text NOT NULL UNIQUE,
  from_warehouse_id uuid NOT NULL REFERENCES configuration.warehouses(id),
  to_warehouse_id   uuid NOT NULL REFERENCES configuration.warehouses(id),
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
  notes             text,
  created_by        uuid,
  sent_by           uuid,
  sent_at           timestamptz,
  received_by       uuid,
  received_at       timestamptz,
  cancelled_by      uuid,
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_stock_transfers_distinct_locations CHECK (from_warehouse_id <> to_warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_pos_stock_transfers_status
  ON pos.pos_stock_transfers (status, created_at DESC);

CREATE TABLE IF NOT EXISTS pos.pos_stock_transfer_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES pos.pos_stock_transfers(id) ON DELETE CASCADE,
  sku_id      uuid NOT NULL REFERENCES pos.pos_product_skus(id),
  qty         numeric NOT NULL CHECK (qty > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transfer_id, sku_id)
);

CREATE OR REPLACE FUNCTION pos.pos_next_stock_transfer_no()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'TRF-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-'
         || lpad(nextval('pos.pos_stock_transfer_seq')::text, 4, '0')
$$;

-- Kirim: stok keluar dari lokasi asal (semua baris atau tidak sama sekali).
CREATE OR REPLACE FUNCTION pos.pos_stock_transfer_send(p_transfer_id uuid, p_user uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  t record;
  r record;
  v_res jsonb;
BEGIN
  SELECT * INTO t FROM pos.pos_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Transfer tidak ditemukan'; END IF;
  IF t.status <> 'draft' THEN RAISE EXCEPTION 'Transfer % sudah %', t.transfer_no, t.status; END IF;
  IF NOT EXISTS (SELECT 1 FROM pos.pos_stock_transfer_items WHERE transfer_id = p_transfer_id) THEN
    RAISE EXCEPTION 'Transfer % belum punya barang', t.transfer_no;
  END IF;

  FOR r IN
    SELECT i.sku_id, i.qty, s.sku, s.name AS sku_name, p.name AS product_name
    FROM pos.pos_stock_transfer_items i
    JOIN pos.pos_product_skus s ON s.id = i.sku_id
    JOIN pos.pos_products p ON p.id = s.product_id
    WHERE i.transfer_id = p_transfer_id
    ORDER BY s.sku
  LOOP
    IF NOT pos.pos_sku_has_locations(r.sku_id) THEN
      RAISE EXCEPTION '% (%) bukan produk multi-toko', r.product_name, r.sku;
    END IF;
    -- Transfer selalu dijaga: stok asal tidak boleh minus walau produk mengizinkan.
    IF COALESCE((SELECT stock_quantity FROM pos.pos_sku_stock_locations
                 WHERE sku_id = r.sku_id AND warehouse_id = t.from_warehouse_id), 0) < r.qty THEN
      RAISE EXCEPTION 'Stok % % di lokasi asal tidak cukup untuk dikirim %', r.product_name, r.sku_name, r.qty;
    END IF;
    v_res := pos.pos_apply_sku_location_delta(
      r.sku_id, t.from_warehouse_id, -r.qty, 'transfer_out', true,
      'stock_transfer', t.id, t.transfer_no, NULL, p_user);
    IF (v_res->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Stok % % di lokasi asal tidak cukup', r.product_name, r.sku_name;
    END IF;
  END LOOP;

  UPDATE pos.pos_stock_transfers
  SET status = 'sent', sent_by = p_user, sent_at = now(), updated_at = now()
  WHERE id = p_transfer_id;
END;
$$;

-- Terima: stok masuk ke lokasi tujuan.
CREATE OR REPLACE FUNCTION pos.pos_stock_transfer_receive(p_transfer_id uuid, p_user uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  t record;
  r record;
BEGIN
  SELECT * INTO t FROM pos.pos_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Transfer tidak ditemukan'; END IF;
  IF t.status <> 'sent' THEN RAISE EXCEPTION 'Transfer % belum dikirim (status %)', t.transfer_no, t.status; END IF;

  FOR r IN SELECT sku_id, qty FROM pos.pos_stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
    PERFORM pos.pos_apply_sku_location_delta(
      r.sku_id, t.to_warehouse_id, r.qty, 'transfer_in', false,
      'stock_transfer', t.id, t.transfer_no, NULL, p_user);
  END LOOP;

  UPDATE pos.pos_stock_transfers
  SET status = 'received', received_by = p_user, received_at = now(), updated_at = now()
  WHERE id = p_transfer_id;
END;
$$;

-- Batal: draft langsung batal; yang sudah dikirim → stok kembali ke asal.
CREATE OR REPLACE FUNCTION pos.pos_stock_transfer_cancel(p_transfer_id uuid, p_user uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  t record;
  r record;
BEGIN
  SELECT * INTO t FROM pos.pos_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Transfer tidak ditemukan'; END IF;
  IF t.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Transfer % sudah % — tidak bisa dibatalkan', t.transfer_no, t.status;
  END IF;

  IF t.status = 'sent' THEN
    FOR r IN SELECT sku_id, qty FROM pos.pos_stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
      PERFORM pos.pos_apply_sku_location_delta(
        r.sku_id, t.from_warehouse_id, r.qty, 'transfer_cancel', false,
        'stock_transfer', t.id, t.transfer_no, 'Transfer dibatalkan — stok kembali', p_user);
    END LOOP;
  END IF;

  UPDATE pos.pos_stock_transfers
  SET status = 'cancelled', cancelled_by = p_user, cancelled_at = now(), updated_at = now()
  WHERE id = p_transfer_id;
END;
$$;
