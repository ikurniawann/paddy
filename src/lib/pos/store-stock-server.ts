// Multi-toko — akses DB stok per toko & transfer stok antar lokasi.
// Semua mutasi stok lewat fungsi SQL (pos.pos_set_sku_location_stock,
// pos.pos_stock_transfer_*) supaya kartu stok & total varian selalu konsisten.

import { query, queryOne, withTransaction } from "@/lib/db";
import {
  collectAllStoresSkuIds,
  type StockTransferAction,
  type StockTransferStatus,
  type StoreSkuStock,
} from "@/lib/pos/store-stock";

/** Stok toko untuk varian produk multi-toko di katalog kasir. */
export async function loadStoreSkuStock(
  products: Array<Record<string, unknown>>,
  warehouseId: string | null
): Promise<StoreSkuStock | null> {
  if (!warehouseId) return null;
  const skuIds = collectAllStoresSkuIds(products);
  if (skuIds.length === 0) return { warehouseId, bySku: new Map() };
  const rows = await query<{ sku_id: string; stock_quantity: string }>(
    `SELECT sku_id, stock_quantity
     FROM pos.pos_sku_stock_locations
     WHERE warehouse_id = $1 AND sku_id = ANY($2::uuid[])`,
    [warehouseId, skuIds]
  );
  return {
    warehouseId,
    bySku: new Map(rows.map((row) => [row.sku_id, Number(row.stock_quantity) || 0])),
  };
}

export type StockLocation = {
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  branch_id: string;
  branch_code: string;
  branch_name: string;
};

/** Semua lokasi aktif (stall dari cabang aktif) — kolom tabel stok per toko. */
export async function listStockLocations(): Promise<StockLocation[]> {
  return query<StockLocation>(
    `SELECT w.id AS warehouse_id, w.code AS warehouse_code, w.name AS warehouse_name,
            b.id AS branch_id, b.code AS branch_code, b.name AS branch_name
     FROM configuration.warehouses w
     JOIN configuration.branches b ON b.id = w.branch_id
     WHERE w.is_active AND b.is_active
     ORDER BY b.created_at, b.name, w.is_default DESC, w.name`
  );
}

export type StoreStockSku = {
  sku_id: string;
  sku: string;
  sku_name: string;
  barcode: string | null;
  is_active: boolean;
  stock_total: number;
  stock_by_location: Record<string, number>;
};

export type StoreStockProduct = {
  product_id: string;
  product_name: string;
  product_sku: string;
  category_name: string | null;
  image_url: string | null;
  home_warehouse_id: string | null;
  skus: StoreStockSku[];
};

/** Matriks stok varian × lokasi untuk semua produk multi-toko. */
export async function listStoreStock(filter: {
  search?: string | null;
  productId?: string | null;
}): Promise<StoreStockProduct[]> {
  const params: unknown[] = [];
  const where: string[] = ["pp.store_scope = 'all'", "pp.is_active"];
  if (filter.productId) {
    params.push(filter.productId);
    where.push(`pp.id = $${params.length}`);
  }
  if (filter.search?.trim()) {
    params.push(`%${filter.search.trim()}%`);
    where.push(`(pp.name ILIKE $${params.length} OR pp.sku ILIKE $${params.length}
                 OR EXISTS (SELECT 1 FROM pos.pos_product_skus s2 WHERE s2.product_id = pp.id
                            AND (s2.sku ILIKE $${params.length} OR s2.name ILIKE $${params.length}
                                 OR s2.barcode ILIKE $${params.length})))`);
  }

  const rows = await query<{
    product_id: string;
    product_name: string;
    product_sku: string;
    category_name: string | null;
    image_url: string | null;
    home_warehouse_id: string | null;
    sku_id: string;
    sku: string;
    sku_name: string;
    barcode: string | null;
    is_active: boolean;
    stock_total: string;
    locations: Array<{ warehouse_id: string; qty: string | number }> | null;
  }>(
    `SELECT pp.id AS product_id, pp.name AS product_name, pp.sku AS product_sku,
            c.name AS category_name, pp.image_url,
            pos.pos_product_home_warehouse(pp.id) AS home_warehouse_id,
            s.id AS sku_id, s.sku, s.name AS sku_name, s.barcode, s.is_active,
            COALESCE(s.stock_quantity, 0) AS stock_total,
            (SELECT json_agg(json_build_object('warehouse_id', l.warehouse_id, 'qty', l.stock_quantity))
             FROM pos.pos_sku_stock_locations l WHERE l.sku_id = s.id) AS locations
     FROM pos.pos_products pp
     JOIN pos.pos_product_skus s ON s.product_id = pp.id
     LEFT JOIN pos.pos_categories c ON c.id = pp.category_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.display_order NULLS LAST, pp.name, s.sku`,
    params
  );

  const products = new Map<string, StoreStockProduct>();
  for (const row of rows) {
    let product = products.get(row.product_id);
    if (!product) {
      product = {
        product_id: row.product_id,
        product_name: row.product_name,
        product_sku: row.product_sku,
        category_name: row.category_name,
        image_url: row.image_url,
        home_warehouse_id: row.home_warehouse_id,
        skus: [],
      };
      products.set(row.product_id, product);
    }
    const byLocation: Record<string, number> = {};
    for (const loc of row.locations ?? []) {
      byLocation[loc.warehouse_id] = Number(loc.qty) || 0;
    }
    product.skus.push({
      sku_id: row.sku_id,
      sku: row.sku,
      sku_name: row.sku_name,
      barcode: row.barcode,
      is_active: row.is_active,
      stock_total: Number(row.stock_total) || 0,
      stock_by_location: byLocation,
    });
  }
  return [...products.values()];
}

export class StoreStockError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Pesan RAISE EXCEPTION dari fungsi SQL → pesan untuk pengguna. */
function toStoreStockError(error: unknown): StoreStockError {
  const message = error instanceof Error ? error.message : String(error);
  return new StoreStockError(message.replace(/^error:\s*/i, ""));
}

async function assertLocation(warehouseId: string): Promise<void> {
  const row = await queryOne<{ id: string }>(
    `SELECT w.id FROM configuration.warehouses w
     JOIN configuration.branches b ON b.id = w.branch_id
     WHERE w.id = $1 AND w.is_active AND b.is_active`,
    [warehouseId]
  );
  if (!row) throw new StoreStockError("Lokasi tidak ditemukan atau nonaktif", 404);
}

/** Koreksi stok absolut satu varian di satu lokasi (stock opname toko). */
export async function setSkuLocationStock(input: {
  skuId: string;
  warehouseId: string;
  qty: number;
  userId: string | null;
  note?: string | null;
}): Promise<{ quantity_after: number }> {
  await assertLocation(input.warehouseId);
  try {
    const row = await queryOne<{ result: { quantity_after?: number } }>(
      `SELECT pos.pos_set_sku_location_stock($1, $2, $3, $4, $5) AS result`,
      [input.skuId, input.warehouseId, input.qty, input.userId, input.note ?? null]
    );
    return { quantity_after: Number(row?.result?.quantity_after ?? input.qty) };
  } catch (error) {
    throw toStoreStockError(error);
  }
}

export type StockMovementRow = {
  id: string;
  created_at: string;
  warehouse_id: string;
  warehouse_name: string;
  movement_type: string;
  qty_change: number;
  qty_after: number;
  reference_type: string | null;
  reference_no: string | null;
  note: string | null;
  created_by_name: string | null;
};

/** Kartu stok satu varian (opsional per lokasi), terbaru dulu. */
export async function listSkuMovements(input: {
  skuId: string;
  warehouseId?: string | null;
  limit?: number;
}): Promise<StockMovementRow[]> {
  const params: unknown[] = [input.skuId];
  let where = "m.sku_id = $1";
  if (input.warehouseId) {
    params.push(input.warehouseId);
    where += ` AND m.warehouse_id = $${params.length}`;
  }
  params.push(Math.min(Math.max(input.limit ?? 100, 1), 500));
  const rows = await query<StockMovementRow & { qty_change: string; qty_after: string }>(
    `SELECT m.id, m.created_at, m.warehouse_id, w.name AS warehouse_name, m.movement_type,
            m.qty_change, m.qty_after, m.reference_type, m.reference_no, m.note,
            u.full_name AS created_by_name
     FROM pos.pos_sku_stock_movements m
     JOIN configuration.warehouses w ON w.id = m.warehouse_id
     LEFT JOIN configuration.users u ON u.id = m.created_by
     WHERE ${where}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.map((row) => ({
    ...row,
    qty_change: Number(row.qty_change),
    qty_after: Number(row.qty_after),
  }));
}

// ── Transfer stok ───────────────────────────────────────────────────────────

export type StockTransferRow = {
  id: string;
  transfer_no: string;
  status: StockTransferStatus;
  from_warehouse_id: string;
  from_name: string;
  to_warehouse_id: string;
  to_name: string;
  notes: string | null;
  item_count: number;
  total_qty: number;
  created_at: string;
  created_by_name: string | null;
  sent_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
};

export type StockTransferItemRow = {
  id: string;
  sku_id: string;
  sku: string;
  sku_name: string;
  product_name: string;
  qty: number;
  stock_at_source: number;
  stock_at_destination: number;
};

const TRANSFER_SELECT = `
  SELECT t.id, t.transfer_no, t.status, t.from_warehouse_id, wf.name AS from_name,
         t.to_warehouse_id, wt.name AS to_name, t.notes,
         (SELECT count(*)::int FROM pos.pos_stock_transfer_items i WHERE i.transfer_id = t.id) AS item_count,
         (SELECT COALESCE(sum(i.qty), 0) FROM pos.pos_stock_transfer_items i WHERE i.transfer_id = t.id) AS total_qty,
         t.created_at, u.full_name AS created_by_name, t.sent_at, t.received_at, t.cancelled_at
  FROM pos.pos_stock_transfers t
  JOIN configuration.warehouses wf ON wf.id = t.from_warehouse_id
  JOIN configuration.warehouses wt ON wt.id = t.to_warehouse_id
  LEFT JOIN configuration.users u ON u.id = t.created_by`;

function mapTransfer(row: StockTransferRow & { total_qty: unknown }): StockTransferRow {
  return { ...row, total_qty: Number(row.total_qty) || 0 };
}

export async function listStockTransfers(filter: {
  status?: string | null;
  warehouseId?: string | null;
}): Promise<StockTransferRow[]> {
  const params: unknown[] = [];
  const where: string[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`t.status = $${params.length}`);
  }
  if (filter.warehouseId) {
    params.push(filter.warehouseId);
    where.push(`(t.from_warehouse_id = $${params.length} OR t.to_warehouse_id = $${params.length})`);
  }
  const rows = await query<StockTransferRow>(
    `${TRANSFER_SELECT}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY t.created_at DESC
     LIMIT 200`,
    params
  );
  return rows.map(mapTransfer);
}

export async function getStockTransfer(
  id: string
): Promise<(StockTransferRow & { items: StockTransferItemRow[] }) | null> {
  const row = await queryOne<StockTransferRow>(`${TRANSFER_SELECT} WHERE t.id = $1`, [id]);
  if (!row) return null;
  const items = await query<StockTransferItemRow & { qty: string; stock_at_source: string; stock_at_destination: string }>(
    `SELECT i.id, i.sku_id, s.sku, s.name AS sku_name, p.name AS product_name, i.qty,
            COALESCE((SELECT l.stock_quantity FROM pos.pos_sku_stock_locations l
                      WHERE l.sku_id = i.sku_id AND l.warehouse_id = $2), 0) AS stock_at_source,
            COALESCE((SELECT l.stock_quantity FROM pos.pos_sku_stock_locations l
                      WHERE l.sku_id = i.sku_id AND l.warehouse_id = $3), 0) AS stock_at_destination
     FROM pos.pos_stock_transfer_items i
     JOIN pos.pos_product_skus s ON s.id = i.sku_id
     JOIN pos.pos_products p ON p.id = s.product_id
     WHERE i.transfer_id = $1
     ORDER BY p.name, s.sku`,
    [id, row.from_warehouse_id, row.to_warehouse_id]
  );
  return {
    ...mapTransfer(row),
    items: items.map((item) => ({
      ...item,
      qty: Number(item.qty),
      stock_at_source: Number(item.stock_at_source),
      stock_at_destination: Number(item.stock_at_destination),
    })),
  };
}

/** Buat transfer (draft); `send=true` langsung kirim dalam transaksi yang sama. */
export async function createStockTransfer(input: {
  fromId: string;
  toId: string;
  items: Array<{ skuId: string; qty: number }>;
  notes?: string | null;
  userId: string | null;
  send?: boolean;
}): Promise<{ id: string; transfer_no: string }> {
  await assertLocation(input.fromId);
  await assertLocation(input.toId);
  try {
    return await withTransaction(async (client) => {
      const skuIds = input.items.map((item) => item.skuId);
      const { rows: valid } = await client.query<{ id: string }>(
        `SELECT s.id FROM pos.pos_product_skus s
         JOIN pos.pos_products p ON p.id = s.product_id
         WHERE s.id = ANY($1::uuid[]) AND p.store_scope = 'all'`,
        [skuIds]
      );
      if (valid.length !== new Set(skuIds).size) {
        throw new StoreStockError("Ada varian yang bukan produk multi-toko atau tidak ditemukan");
      }
      const { rows } = await client.query<{ id: string; transfer_no: string }>(
        `INSERT INTO pos.pos_stock_transfers (transfer_no, from_warehouse_id, to_warehouse_id, notes, created_by)
         VALUES (pos.pos_next_stock_transfer_no(), $1, $2, $3, $4)
         RETURNING id, transfer_no`,
        [input.fromId, input.toId, input.notes?.trim() || null, input.userId]
      );
      const transfer = rows[0];
      for (const item of input.items) {
        await client.query(
          `INSERT INTO pos.pos_stock_transfer_items (transfer_id, sku_id, qty) VALUES ($1, $2, $3)`,
          [transfer.id, item.skuId, item.qty]
        );
      }
      if (input.send) {
        await client.query(`SELECT pos.pos_stock_transfer_send($1, $2)`, [transfer.id, input.userId]);
      }
      return transfer;
    });
  } catch (error) {
    if (error instanceof StoreStockError) throw error;
    throw toStoreStockError(error);
  }
}

const TRANSFER_FUNCTION: Record<StockTransferAction, string> = {
  send: "pos.pos_stock_transfer_send",
  receive: "pos.pos_stock_transfer_receive",
  cancel: "pos.pos_stock_transfer_cancel",
};

export async function runStockTransferAction(
  id: string,
  action: StockTransferAction,
  userId: string | null
): Promise<void> {
  try {
    await withTransaction(async (client) => {
      await client.query(`SELECT ${TRANSFER_FUNCTION[action]}($1, $2)`, [id, userId]);
    });
  } catch (error) {
    throw toStoreStockError(error);
  }
}

/** Aktifkan/nonaktifkan mode multi-toko sebuah produk POS. */
export async function setProductStoreScope(
  productId: string,
  scope: "stall" | "all",
  userId: string | null
): Promise<void> {
  try {
    await withTransaction(async (client) => {
      if (scope === "all") {
        await client.query(`SELECT pos.pos_enable_multi_store($1, $2)`, [productId, userId]);
      } else {
        await client.query(`SELECT pos.pos_disable_multi_store($1)`, [productId]);
      }
    });
  } catch (error) {
    throw toStoreStockError(error);
  }
}

/** Varian multi-toko di bawah stok minimum per lokasi (untuk peringatan stok). */
export async function listLowStoreStock(): Promise<
  Array<{
    product_id: string;
    product_name: string;
    sku_id: string;
    sku: string;
    sku_name: string;
    warehouse_id: string;
    warehouse_name: string;
    stock_quantity: number;
    min_stock: number;
  }>
> {
  const rows = await query<{
    product_id: string;
    product_name: string;
    sku_id: string;
    sku: string;
    sku_name: string;
    warehouse_id: string;
    warehouse_name: string;
    stock_quantity: string;
    min_stock: string;
  }>(
    `SELECT p.id AS product_id, p.name AS product_name, s.id AS sku_id, s.sku, s.name AS sku_name,
            w.id AS warehouse_id, w.name AS warehouse_name, l.stock_quantity,
            GREATEST(l.min_stock, COALESCE(st.low_stock_threshold, 0)) AS min_stock
     FROM pos.pos_sku_stock_locations l
     JOIN pos.pos_product_skus s ON s.id = l.sku_id AND s.is_active
     JOIN pos.pos_products p ON p.id = s.product_id AND p.is_active AND p.store_scope = 'all'
     JOIN configuration.warehouses w ON w.id = l.warehouse_id AND w.is_active
     LEFT JOIN pos.pos_inventory_settings st ON st.product_id = p.id
     WHERE l.stock_quantity <= GREATEST(l.min_stock, COALESCE(st.low_stock_threshold, 0))
     ORDER BY l.stock_quantity, p.name, s.sku`
  );
  return rows.map((row) => ({
    ...row,
    stock_quantity: Number(row.stock_quantity),
    min_stock: Number(row.min_stock),
  }));
}
