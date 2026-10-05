-- Titik "Ambil di toko" untuk website toko (EPIC-054). Satu baris per stall toko
-- (multi-toko EPIC-052): alamat & jam buka yang ditampilkan ke pembeli; stok
-- pengambilan dipotong dari stall ini.
CREATE TABLE IF NOT EXISTS shop.pickup_points (
  warehouse_id  uuid PRIMARY KEY REFERENCES configuration.warehouses(id) ON DELETE CASCADE,
  name          text NOT NULL,
  address       text NOT NULL,
  city          text NOT NULL,
  opening_hours text,
  maps_url      text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
