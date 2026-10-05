"use client";

import { useEffect, useState } from "react";
import type { StoreCartLine } from "@/lib/store/catalog-server";
import { cartStore, useCart } from "@/features/store/components/use-cart";
import { cartLineKey, maxPurchasableQty, reconcileCart, type CartItem } from "@/features/store/lib/cart";

export type CartRow = { key: string; item: CartItem; line: StoreCartLine; max: number | null; soldOut: boolean };

type SnapshotState = { key: string; lines: Array<StoreCartLine | null> } | null;

/**
 * Harga & stok terbaru untuk isi keranjang. Baris yang tidak dijual lagi
 * dibuang dari keranjang dan qty dipangkas ke stok tersedia.
 */
export function useCartSnapshot() {
  const cart = useCart();
  const [snapshot, setSnapshot] = useState<SnapshotState>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [removed, setRemoved] = useState(0);
  const requestKey = cart.items.map(cartLineKey).join("|");

  useEffect(() => {
    if (!requestKey) return;
    const items = requestKey.split("|").map((key) => {
      const [productId, skuId] = key.split(":");
      return { product_id: productId, sku_id: skuId || null };
    });
    const controller = new AbortController();
    fetch("/api/public/store/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as
          | { success: true; data: Array<StoreCartLine | null> }
          | { success: false; error: string }
          | null;
        if (!json || !json.success) throw new Error(json && !json.success ? json.error : "Gagal memuat keranjang");
        setSnapshot({ key: requestKey, lines: json.data });
        setError(null);
        // Sesuaikan isi keranjang (urutan request = urutan keranjang saat ini).
        const current = cartStore.getSnapshot();
        if (current.map(cartLineKey).join("|") === requestKey) {
          const result = reconcileCart(current, json.data);
          if (result.removed > 0) setRemoved((n) => n + result.removed);
          if (result.changed) cartStore.update(() => result.items);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError({ key: requestKey, message: err instanceof Error ? err.message : "Gagal memuat keranjang" });
      });
    return () => controller.abort();
    // Hanya bergantung pada daftar baris (bukan qty) supaya ubah qty tidak memicu fetch ulang.
  }, [requestKey]);

  const lineByKey = new Map<string, StoreCartLine>();
  if (snapshot) {
    snapshot.key.split("|").forEach((key, index) => {
      const line = snapshot.lines[index];
      if (line) lineByKey.set(key, line);
    });
  }

  const rows: CartRow[] = [];
  for (const item of cart.items) {
    const key = cartLineKey(item);
    const line = lineByKey.get(key);
    if (!line) continue;
    const max = line.skuId ? maxPurchasableQty(line) : null;
    rows.push({ key, item, line, max, soldOut: max !== null && max <= 0 });
  }

  const loading = cart.items.length > 0 && rows.length < cart.items.length && (!error || error.key !== requestKey);
  return {
    cart,
    rows,
    loading,
    error: error && error.key === requestKey ? error.message : null,
    removed,
    dismissRemoved: () => setRemoved(0),
  };
}
