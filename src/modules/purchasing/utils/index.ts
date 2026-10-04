// ============================================================
// Purchasing Module Utilities
// ============================================================

import { MaterialUnit, StockWarningThreshold } from "../constants";
import {
  PRStatus,
  PRPriority,
  POStatus,
  QCStatus,
  GRNStatus,
  AdjustmentReason,
  CostType,
  VendorStatus,
} from "../constants";
import {
  PR_STATUS_LABELS,
  PR_STATUS_COLORS,
  PR_PRIORITY_LABELS,
  PR_PRIORITY_COLORS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
  QC_STATUS_LABELS,
  QC_STATUS_COLORS,
  GRN_STATUS_LABELS,
  ADJUSTMENT_REASON_LABELS,
  COST_TYPE_LABELS,
  VENDOR_STATUS_LABELS,
} from "../constants";

// ── Formatters ─────────────────────────────────────────────

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams} g`;
}

export function formatUnit(value: number, unit: MaterialUnit): string {
  const unitLabels: Record<MaterialUnit, string> = {
    kg: "kg",
    g: "g",
    L: "L",
    mL: "mL",
    pcs: "pcs",
    roll: "roll",
    lembar: "lembar",
    m: "m",
    pack: "pack",
    drum: "drum",
    zak: "zak",
  };
  return `${value} ${unitLabels[unit] ?? unit}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ── Status helpers ──────────────────────────────────────────

export function getPRStatusLabel(status: string): { label: string; color: string } {
  return {
    label: PR_STATUS_LABELS[status as PRStatus] ?? status,
    color: PR_STATUS_COLORS[status as PRStatus] ?? "bg-gray-100 text-gray-700",
  };
}

export function getPRPriorityLabel(priority: string): { label: string; color: string } {
  return {
    label: PR_PRIORITY_LABELS[priority as PRPriority] ?? priority,
    color: PR_PRIORITY_COLORS[priority as PRPriority] ?? "bg-gray-100 text-gray-700",
  };
}

export function getPOStatusLabel(status: string): { label: string; color: string } {
  return {
    label: PO_STATUS_LABELS[status as POStatus] ?? status,
    color: PO_STATUS_COLORS[status as POStatus] ?? "bg-gray-100 text-gray-700",
  };
}

export function getQCStatusLabel(status: string): { label: string; color: string } {
  return {
    label: QC_STATUS_LABELS[status as QCStatus] ?? status,
    color: QC_STATUS_COLORS[status as QCStatus] ?? "bg-gray-100 text-gray-700",
  };
}

export function getGRNStatusLabel(status: string): { label: string; color: string } {
  return {
    label: GRN_STATUS_LABELS[status as GRNStatus] ?? status,
    color: "bg-gray-100 text-gray-700",
  };
}

export function getAdjustmentReasonLabel(reason: string): string {
  return ADJUSTMENT_REASON_LABELS[reason as AdjustmentReason] ?? reason;
}

export function getCostTypeLabel(type: string): string {
  return COST_TYPE_LABELS[type as CostType] ?? type;
}

export function getVendorStatusLabel(status: string): { label: string; color: string } {
  const labels: Record<string, { label: string; color: string }> = {
    active: { label: "Aktif", color: "bg-green-100 text-green-800" },
    inactive: { label: "Tidak Aktif", color: "bg-gray-100 text-gray-600" },
    blocked: { label: "Diblokir", color: "bg-red-100 text-red-800" },
    probation: { label: "Masa Percobaan", color: "bg-yellow-100 text-yellow-800" },
  };
  return labels[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

// ── Stock warning ───────────────────────────────────────────

export function getStockStatus(
  qtyOnHand: number,
  minimumStok: number,
  reorderPoint?: number,
  maximumStok?: number
): StockWarningThreshold {
  if (qtyOnHand < minimumStok) return "low";
  if (reorderPoint && qtyOnHand < reorderPoint) return "medium";
  if (maximumStok && qtyOnHand > maximumStok) return "over";
  return "adequate";
}

export function getStockStatusMeta(status: StockWarningThreshold): { label: string; color: string; icon: string } {
  const map: Record<StockWarningThreshold, { label: string; color: string; icon: string }> = {
    low: { label: "Stok Rendah", color: "text-red-600 bg-red-50 border-red-200", icon: "⚠️" },
    medium: { label: "Stok Menipis", color: "text-orange-600 bg-orange-50 border-orange-200", icon: "📉" },
    adequate: { label: "Adequat", color: "text-green-600 bg-green-50 border-green-200", icon: "✅" },
    over: { label: "Over Stok", color: "text-blue-600 bg-blue-50 border-blue-200", icon: "📦" },
  };
  return map[status];
}

// ── COGS / HPP ─────────────────────────────────────────────

export function calculateAllocatedCost(
  totalCost: number,
  itemValue: number,
  totalValue: number,
  method: "by_value" | "by_weight" | "by_quantity" | "equally",
  itemQuantity = 1,
  totalQuantity = 1
): number {
  switch (method) {
    case "by_value":
      if (totalValue === 0) return 0;
      return (itemValue / totalValue) * totalCost;
    case "by_weight":
      return 0; // handled in service with weight field
    case "by_quantity":
      if (totalQuantity === 0) return 0;
      return (itemQuantity / totalQuantity) * totalCost;
    case "equally":
      return totalCost / totalQuantity;
    default:
      return 0;
  }
}

export function calculateHPP(
  bomItems: { materialId: string; quantity: number; avgCost: number }[],
  allocatedOverhead = 0
): number {
  const materialCost = bomItems.reduce((sum, item) => sum + item.quantity * item.avgCost, 0);
  return materialCost + allocatedOverhead;
}

export function calculateMargin(hpp: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - hpp) / sellingPrice) * 100;
}

// ── CSV export ─────────────────────────────────────────────

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
): void {
  const header = columns.map((c) => c.header).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = String(row[c.key] ?? "");
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Validation helpers ─────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[\d\s\-+()]{8,}$/.test(phone);
}

// ── Misc ──────────────────────────────────────────────────

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const val = String(item[key]);
    (groups[val] = groups[val] || []).push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
