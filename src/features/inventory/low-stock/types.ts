export interface LowStockItem {
  id: string;
  material_kode: string;
  material_nama: string;
  kategori: string;
  qty_available: number;
  qty_minimum: number;
  qty_maximum: number;
  unit_cost: number;
  satuan: string;
  stock_status: string;
  shortage_qty: number;
  suggested_order_qty: number;
  estimated_cost: number;
  supplier_name?: string;
  last_purchase_date?: string;
}

export interface LowStockParams {
  category?: string;
  status?: string;
}
