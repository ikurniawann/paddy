"use client";

import { useQuery } from "@tanstack/react-query";

// ── Types ───────────────────────────────────────────────────────────────────

export interface PurchasingKPIs {
  totalPOCount: number;
  totalPOCountChange: number;
  totalPOValue: number;
  totalPOValueChange: number;
  lowStockCount: number;
  pendingApprovalCount: number;
}

export interface MonthlyTrend {
  month: string;
  [category: string]: string | number;
}

export interface ActionPO {
  id: string;
  po_number: string;
  supplier_name: string;
  order_date: string;
  expected_date: string;
  status: string;
  days_overdue: number;
  notes?: string;
}

export interface StockAlert {
  id: string;
  material_name: string;
  category: string;
  qty_on_hand: number;
  minimum_stok: number;
  unit: string;
  alert_level: "critical" | "warning";
}

export interface HPPTrend {
  product_name: string;
  current_hpp: number;
  previous_hpp: number;
  change_percent: number;
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  on_time_rate: number;
  qc_pass_rate: number;
  total_deliveries: number;
  avg_lead_time_days: number;
}

export interface PurchasingDashboardData {
  kpis: PurchasingKPIs;
  monthlyTrends: MonthlyTrend[];
  actionPOs: ActionPO[];
  stockAlerts: StockAlert[];
  hppTrends: HPPTrend[];
  supplierPerformance: SupplierPerformance[];
}

// ── Mock data builders ──────────────────────────────────────────────────────

function buildMockKPIs(): PurchasingKPIs {
  return {
    totalPOCount: 24,
    totalPOCountChange: 12.5,
    totalPOValue: 847_500_000,
    totalPOValueChange: -3.2,
    lowStockCount: 7,
    pendingApprovalCount: 3,
  };
}

function buildMockTrends(): MonthlyTrend[] {
  const categories = ["Bahan Kering", "Bahan Basah", "Kemasan", "Subkon"];
  const months = ["Okt", "Nov", "Des", "Jan", "Feb", "Mar"];
  return months.map((month) => {
    const row: MonthlyTrend = { month };
    categories.forEach((cat) => {
      row[cat] = Math.round((Math.random() * 80 + 40) * 1_000_000);
    });
    return row;
  });
}

function buildMockActionPOs(): ActionPO[] {
  return [
    { id: "1", po_number: "PO-2025-0031", supplier_name: "PT Sari Laut", order_date: "2025-03-10", expected_date: "2025-03-15", status: "sent", days_overdue: 3 },
    { id: "2", po_number: "PO-2025-0029", supplier_name: "CV Berkah Packaging", order_date: "2025-03-08", expected_date: "2025-03-14", status: "sent", days_overdue: 1 },
    { id: "3", po_number: "PO-2025-0028", supplier_name: "UD Sumber Jaya", order_date: "2025-03-05", expected_date: "2025-03-12", status: "waiting_approval", days_overdue: 0 },
    { id: "4", po_number: "PO-2025-0027", supplier_name: "PT Makmur Jaya", order_date: "2025-03-01", expected_date: "2025-03-07", status: "waiting_approval", days_overdue: 0 },
  ];
}

function buildMockStockAlerts(): StockAlert[] {
  return [
    { id: "1", material_name: "Tepung Terigu", category: "Bahan Kering", qty_on_hand: 0, minimum_stok: 200, unit: "kg", alert_level: "critical" },
    { id: "2", material_name: "Gula Pasir", category: "Bahan Kering", qty_on_hand: 30, minimum_stok: 100, unit: "kg", alert_level: "critical" },
    { id: "3", material_name: "Minyak Goreng", category: "Bahan Basah", qty_on_hand: 40, minimum_stok: 50, unit: "liter", alert_level: "warning" },
    { id: "4", material_name: "Telur Ayam", category: "Bahan Basah", qty_on_hand: 5, minimum_stok: 20, unit: "kg", alert_level: "warning" },
    { id: "5", material_name: "Kertas Box", category: "Kemasan", qty_on_hand: 0, minimum_stok: 50, unit: "pcs", alert_level: "critical" },
    { id: "6", material_name: "Plastik Wrap", category: "Kemasan", qty_on_hand: 15, minimum_stok: 30, unit: "roll", alert_level: "warning" },
    { id: "7", material_name: "Ragi", category: "Bahan Kering", qty_on_hand: 8, minimum_stok: 20, unit: "kg", alert_level: "warning" },
  ];
}

function buildMockHPPTrends(): HPPTrend[] {
  return [
    { product_name: "Roti Tawar", current_hpp: 4_200, previous_hpp: 4_050, change_percent: 3.7 },
    { product_name: "Roti Coklat", current_hpp: 5_800, previous_hpp: 5_600, change_percent: 3.6 },
    { product_name: "Donat", current_hpp: 3_100, previous_hpp: 3_350, change_percent: -7.5 },
    { product_name: "Croissant", current_hpp: 8_500, previous_hpp: 8_200, change_percent: 3.7 },
    { product_name: "Bagelan", current_hpp: 2_900, previous_hpp: 2_750, change_percent: 5.5 },
  ];
}

function buildMockSupplierPerf(): SupplierPerformance[] {
  return [
    { supplier_id: "1", supplier_name: "PT Sari Laut", on_time_rate: 92, qc_pass_rate: 98, total_deliveries: 45, avg_lead_time_days: 4 },
    { supplier_id: "2", supplier_name: "UD Sumber Jaya", on_time_rate: 78, qc_pass_rate: 85, total_deliveries: 32, avg_lead_time_days: 5 },
    { supplier_id: "3", supplier_name: "CV Berkah Packaging", on_time_rate: 88, qc_pass_rate: 91, total_deliveries: 28, avg_lead_time_days: 3 },
    { supplier_id: "4", supplier_name: "PT Makmur Jaya", on_time_rate: 65, qc_pass_rate: 72, total_deliveries: 19, avg_lead_time_days: 7 },
    { supplier_id: "5", supplier_name: "PT Laut Jaya", on_time_rate: 95, qc_pass_rate: 99, total_deliveries: 61, avg_lead_time_days: 2 },
  ];
}

// ── Main hook ───────────────────────────────────────────────────────────────

export function usePurchasingDashboard(
  startDate?: string,
  endDate?: string
) {
  return useQuery<PurchasingDashboardData>({
    queryKey: ["purchasing-dashboard", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const response = await fetch(`/api/purchasing/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    },
    refetchInterval: 1000 * 60 * 5, // 5 menit
    staleTime: 1000 * 60 * 2,
  });
}
