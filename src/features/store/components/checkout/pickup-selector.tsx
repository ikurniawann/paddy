"use client";

import { Clock, MapPin } from "lucide-react";
import type { StorePickupPoint } from "@/lib/store/types";
import type { CartRow } from "@/features/store/components/cart/use-cart-snapshot";
import { cartFulfillable, lineStockFor, type CheckoutStockLine } from "@/features/store/lib/checkout";

type Method = "flat" | "pickup";

/** Ketersediaan stok tiap baris keranjang untuk metode / toko terpilih. */
export function StockList({ rows, method, warehouseId }: { rows: CartRow[]; method: Method; warehouseId: string | null }) {
  return (
    <ul className="mt-3 space-y-1 text-[13px]">
      {rows.map((row) => {
        const stock = lineStockFor({ ...row.line, qty: row.item.qty }, method, warehouseId);
        const ok = stock === null || stock >= row.item.qty;
        return (
          <li key={row.key} className="flex justify-between gap-3">
            <span className="truncate text-[#444]">
              {row.line.name}
              {row.line.variantName ? ` — ${row.line.variantName}` : ""} × {row.item.qty}
            </span>
            <span className={`shrink-0 font-semibold ${ok ? "text-green-700" : "text-[#c00]"}`}>
              {stock === null ? "Tersedia" : ok ? `Stok ${stock}` : `Stok ${stock} (kurang)`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Kartu toko pengambilan; toko yang tidak bisa memenuhi seluruh keranjang dinonaktifkan. */
export function PickupSelector({
  points,
  rows,
  stockLines,
  warehouseId,
  onSelect,
  groupId,
}: {
  points: StorePickupPoint[];
  rows: CartRow[];
  stockLines: CheckoutStockLine[];
  warehouseId: string | null;
  onSelect: (warehouseId: string) => void;
  groupId: string;
}) {
  if (points.length === 0) {
    return <p className="text-[14px] text-[#666]">Belum ada toko pengambilan yang aktif.</p>;
  }
  return (
    <div className="grid gap-3" role="radiogroup" aria-label="Toko pengambilan" id={groupId} tabIndex={-1}>
      {points.map((point) => {
        const ok = cartFulfillable(stockLines, "pickup", point.warehouseId);
        const active = warehouseId === point.warehouseId;
        return (
          <label
            key={point.warehouseId}
            className={`block rounded-md border-2 p-4 transition ${
              !ok
                ? "cursor-not-allowed border-[var(--store-border)] bg-[#fafafa] opacity-70"
                : active
                  ? "cursor-pointer border-[var(--store-pink)] bg-[var(--store-pink-tint)]"
                  : "cursor-pointer border-[var(--store-border)] hover:border-[var(--store-pink-soft)]"
            }`}
          >
            <span className="flex items-start gap-3">
              <input
                type="radio"
                name="pickup-point"
                disabled={!ok}
                checked={active}
                onChange={() => onSelect(point.warehouseId)}
                className="mt-1 accent-[var(--store-pink)]"
              />
              <span className="flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-[#111]">{point.name}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      ok ? "bg-green-50 text-green-700" : "bg-red-50 text-[#c00]"
                    }`}
                  >
                    {ok ? "Stok tersedia" : "Stok tidak cukup"}
                  </span>
                </span>
                <span className="mt-1 flex items-start gap-1.5 text-[13px] text-[#555]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {point.address}
                  {point.city && !point.address.toLowerCase().includes(point.city.toLowerCase()) ? `, ${point.city}` : ""}
                </span>
                {point.openingHours ? (
                  <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#555]">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {point.openingHours}
                  </span>
                ) : null}
                {active || !ok ? <StockList rows={rows} method="pickup" warehouseId={point.warehouseId} /> : null}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
