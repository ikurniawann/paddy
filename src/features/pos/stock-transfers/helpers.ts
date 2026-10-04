// Helper murni halaman Transfer Stok Toko (tanpa React) — mudah diuji.
import { STOCK_TRANSFER_STATUS_LABEL } from "@/lib/pos/store-stock";
import type { StockTransferAction, StockTransferStatus } from "./types";

export const TRANSFER_STATUS_TABS: Array<{ value: "" | StockTransferStatus; label: string }> = [
  { value: "", label: "Semua" },
  { value: "draft", label: STOCK_TRANSFER_STATUS_LABEL.draft },
  { value: "sent", label: STOCK_TRANSFER_STATUS_LABEL.sent },
  { value: "received", label: STOCK_TRANSFER_STATUS_LABEL.received },
  { value: "cancelled", label: STOCK_TRANSFER_STATUS_LABEL.cancelled },
];

export function transferStatusLabel(status: string): string {
  return STOCK_TRANSFER_STATUS_LABEL[status as StockTransferStatus] ?? status;
}

const STATUS_BADGE_CLASS: Record<StockTransferStatus, string> = {
  draft: "border-gray-200 bg-gray-50 text-gray-700",
  sent: "border-amber-200 bg-amber-50 text-amber-700",
  received: "border-green-200 bg-green-50 text-green-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

export function transferStatusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASS[status as StockTransferStatus] ?? STATUS_BADGE_CLASS.draft;
}

export const TRANSFER_ACTION_LABEL: Record<StockTransferAction, string> = {
  send: "Kirim",
  receive: "Terima",
  cancel: "Batalkan",
};

export const TRANSFER_ACTION_SUCCESS: Record<StockTransferAction, string> = {
  send: "Transfer dikirim — stok asal sudah dikurangi",
  receive: "Transfer diterima — stok tujuan sudah ditambah",
  cancel: "Transfer dibatalkan",
};

/** Baris barang di form transfer baru. */
export type TransferDraftLine = {
  sku_id: string;
  sku: string;
  sku_name: string;
  product_name: string;
  qty: number;
  stock_by_location: Record<string, number>;
};

export function lineStockAt(line: Pick<TransferDraftLine, "stock_by_location">, warehouseId: string): number {
  if (!warehouseId) return 0;
  return Number(line.stock_by_location?.[warehouseId]) || 0;
}

/** Tambah varian ke daftar; bila sudah ada, qty ditambah 1. */
export function addDraftLine(
  lines: TransferDraftLine[],
  sku: Omit<TransferDraftLine, "qty">
): TransferDraftLine[] {
  const existing = lines.find((line) => line.sku_id === sku.sku_id);
  if (existing) {
    return lines.map((line) => (line.sku_id === sku.sku_id ? { ...line, qty: line.qty + 1 } : line));
  }
  return [...lines, { ...sku, qty: 1 }];
}

export function updateDraftLineQty(
  lines: TransferDraftLine[],
  skuId: string,
  qty: number
): TransferDraftLine[] {
  const safeQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
  return lines.map((line) => (line.sku_id === skuId ? { ...line, qty: safeQty } : line));
}

export function removeDraftLine(lines: TransferDraftLine[], skuId: string): TransferDraftLine[] {
  return lines.filter((line) => line.sku_id !== skuId);
}

export function lineExceedsStock(line: TransferDraftLine, fromId: string): boolean {
  return Boolean(fromId) && line.qty > lineStockAt(line, fromId);
}

export function draftTotalQty(lines: TransferDraftLine[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
}

/** Validasi form transfer baru — null bila siap disimpan, selain itu pesan error. */
export function validateTransferDraft(input: {
  fromId: string;
  toId: string;
  lines: TransferDraftLine[];
}): string | null {
  if (!input.fromId) return "Pilih lokasi asal";
  if (!input.toId) return "Pilih lokasi tujuan";
  if (input.fromId === input.toId) return "Lokasi asal dan tujuan tidak boleh sama";
  if (input.lines.length === 0) return "Tambahkan minimal satu barang";
  for (const line of input.lines) {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      return `Jumlah ${line.sku} harus lebih dari 0`;
    }
    if (lineExceedsStock(line, input.fromId)) {
      return `Jumlah ${line.sku} melebihi stok di lokasi asal (${lineStockAt(line, input.fromId)})`;
    }
  }
  return null;
}
