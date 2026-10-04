-- Menu POS → Produk & Stok → Stok per Toko & Transfer Stok Toko (multi-toko,
-- lihat 20261004120000_pos_multi_store_stock.sql). Grant mengikuti siapa pun
-- yang sudah punya akses menu Produk.

INSERT INTO iam.menus (code, menu_name, route_path, icon, menu_type, order_number, permission_context)
VALUES
  ('pos.catalog.store-stock', 'Stok per Toko', '/dashboard/pos/store-stock',
   'building-storefront', 'sidebar', 12, '{"actions":["read","update"]}'::jsonb),
  ('pos.catalog.stock-transfers', 'Transfer Stok Toko', '/dashboard/pos/stock-transfers',
   'arrows-right-left', 'sidebar', 13, '{"actions":["read","create","update"]}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  menu_name = EXCLUDED.menu_name, route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon, menu_type = EXCLUDED.menu_type,
  order_number = EXCLUDED.order_number, permission_context = EXCLUDED.permission_context,
  is_active = true, is_visible = true, deleted_at = NULL, updated_at = now();

UPDATE iam.menus SET module = 'pos', level = 3
WHERE code IN ('pos.catalog.store-stock', 'pos.catalog.stock-transfers');

UPDATE iam.menus child SET parent_id = parent.id
FROM iam.menus parent
WHERE child.code IN ('pos.catalog.store-stock', 'pos.catalog.stock-transfers')
  AND parent.code = 'pos.catalog';

INSERT INTO iam.role_menu_permissions (role_id, menu_id, granted_actions)
SELECT rmp.role_id, m_new.id, m_new.permission_context->'actions'
FROM iam.role_menu_permissions rmp
JOIN iam.menus m_products ON m_products.id = rmp.menu_id
  AND m_products.code = 'pos.catalog.products'
CROSS JOIN iam.menus m_new
WHERE m_new.code IN ('pos.catalog.store-stock', 'pos.catalog.stock-transfers')
  AND rmp.is_active
ON CONFLICT (role_id, menu_id) DO UPDATE SET
  is_active = true, granted_actions = EXCLUDED.granted_actions, updated_at = now();
