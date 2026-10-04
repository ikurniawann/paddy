-- Stok per Toko & Transfer Stok pindah ke Items → Produk → Persediaan
-- (keputusan owner 2026-10-04). Lanjutan 20261004121000_pos_store_stock_menus.sql.
--
-- - items.product.inventory.store-stock (baru) + items.product.inventory.transfer
--   (menu lama yang belum punya halaman) → halaman multi-toko. Grant mengikuti
--   role yang sudah punya menu Persediaan → Stok.
-- - Menu POS (pos.catalog.store-stock / stock-transfers) dipertahankan HANYA
--   untuk Store Manager (pos_supervisor). Alasan: guard API IAM berbasis prefix
--   (hasAnyIamMenuPrefix) — memberi role toko satu menu di bawah `items` akan
--   ikut membuka ±64 API Items (GRN, delivery, opname, penyesuaian stok).
-- - Kasir (role pos) tidak lagi punya akses halaman stok/transfer.

INSERT INTO iam.menus (code, menu_name, route_path, icon, menu_type, order_number, permission_context)
VALUES ('items.product.inventory.store-stock', 'Stok per Toko', '/dashboard/product/inventory/store-stock',
        'building-storefront', 'sidebar', 15, '{"actions":["read","update"]}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name, route_path = EXCLUDED.route_path, icon = EXCLUDED.icon,
  menu_type = EXCLUDED.menu_type, order_number = EXCLUDED.order_number,
  permission_context = EXCLUDED.permission_context,
  is_active = true, is_visible = true, deleted_at = NULL, updated_at = now();

UPDATE iam.menus
SET menu_name = 'Transfer Stok', route_path = '/dashboard/product/inventory/transfer',
    permission_context = '{"actions":["read","create","update"]}'::jsonb,
    is_active = true, is_visible = true, deleted_at = NULL, updated_at = now()
WHERE code = 'items.product.inventory.transfer';

UPDATE iam.menus SET module = 'items', level = 4
WHERE code = 'items.product.inventory.store-stock';
UPDATE iam.menus child SET parent_id = parent.id
FROM iam.menus parent
WHERE child.code = 'items.product.inventory.store-stock' AND parent.code = 'items.product.inventory';

INSERT INTO iam.role_menu_permissions (role_id, menu_id, granted_actions)
SELECT rmp.role_id, m_new.id, m_new.permission_context->'actions'
FROM iam.role_menu_permissions rmp
JOIN iam.menus m_stock ON m_stock.id = rmp.menu_id AND m_stock.code = 'items.product.inventory.stock'
CROSS JOIN iam.menus m_new
WHERE m_new.code IN ('items.product.inventory.store-stock', 'items.product.inventory.transfer')
  AND rmp.is_active
ON CONFLICT (role_id, menu_id) DO UPDATE SET
  is_active = true, granted_actions = EXCLUDED.granted_actions, updated_at = now();

-- Menu POS: hanya Store Manager.
UPDATE iam.menus SET menu_name = 'Stok per Toko', order_number = 12, updated_at = now()
WHERE code = 'pos.catalog.store-stock';
UPDATE iam.menus SET menu_name = 'Transfer Stok', order_number = 13, updated_at = now()
WHERE code = 'pos.catalog.stock-transfers';

UPDATE iam.role_menu_permissions rmp
SET is_active = false, updated_at = now()
FROM iam.menus m, iam.roles r
WHERE rmp.menu_id = m.id AND rmp.role_id = r.id
  AND m.code IN ('pos.catalog.store-stock', 'pos.catalog.stock-transfers')
  AND r.code <> 'pos_supervisor';

INSERT INTO iam.role_menu_permissions (role_id, menu_id, granted_actions)
SELECT r.id, m.id, m.permission_context->'actions'
FROM iam.roles r CROSS JOIN iam.menus m
WHERE r.code = 'pos_supervisor'
  AND m.code IN ('pos.catalog.store-stock', 'pos.catalog.stock-transfers')
ON CONFLICT (role_id, menu_id) DO UPDATE SET
  is_active = true, granted_actions = EXCLUDED.granted_actions, updated_at = now();
