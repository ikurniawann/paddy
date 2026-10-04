export type GrnStatus =
  | "pending"
  | "partially_received"
  | "received"
  | "rejected";

export interface GrnListRow {
  id: string;
  nomor_grn: string;
  delivery_id: string;
  delivery_number: string;
  po_id: string;
  po_number: string;
  supplier_name: string;
  no_surat_jalan: string;
  tanggal_penerimaan: string;
  status: GrnStatus;
  total_item_diterima: number;
  total_item_ditolak: number;
  created_at: string;
}

export interface GrnListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GrnListResult {
  data: GrnListRow[];
  total: number;
}

export interface ReceivingWorkspaceData {
  purchase_orders: unknown[];
  deliveries: unknown[];
  grns: unknown[];
}
