"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { findVariant, formatRupiah, type StorePickupPoint, type StoreProductDetail } from "@/lib/store/types";
import { useStore } from "@/features/store/components/store-context";
import { useCart } from "@/features/store/components/use-cart";
import { PriceLine, WishlistButton } from "@/features/store/components/product-card";
import { capQty, MAX_LINE_QTY, maxPurchasableQty } from "@/features/store/lib/cart";
import { axisLabel, optionValueState, pickupStockSummary } from "@/features/store/lib/variants";

export function QtyStepper({
  value,
  onChange,
  max,
  label = "Jumlah",
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  max: number;
  label?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-[32px]" : "h-[36px] lg:h-[28px]";
  const btn = `flex ${h} w-[36px] lg:w-[24px] items-center justify-center bg-[var(--store-pink)] text-white disabled:opacity-40 hover:bg-[var(--store-pink-dark)]`;
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-[6px] border border-[var(--store-pink)]" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label="Kurangi jumlah" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus className="h-3 w-3" strokeWidth={3} />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value.replace(/\D/g, ""));
          onChange(Math.min(Math.max(next || 1, 1), Math.max(1, max)));
        }}
        className={`${h} w-[42px] rounded-none border-0 text-center text-[13px]`}
        style={{ borderWidth: 0 }}
      />
      <button type="button" className={btn} aria-label="Tambah jumlah" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-3 w-3" strokeWidth={3} />
      </button>
    </div>
  );
}

export function ProductPurchase({ product, pickupPoints }: { product: StoreProductDetail; pickupPoints: StorePickupPoint[] }) {
  const cart = useCart();
  const { toast } = useStore();
  const baseId = useId();
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const hasVariants = product.variants.length > 0;
  const complete = product.optionAxes.every((axis) => Boolean(selection[axis.name]));
  const variant = hasVariants && complete ? findVariant(product.variants, selection) : null;
  const unitPrice = variant ? variant.price : product.price;
  const extra = variant ? Math.max(0, variant.price - product.price) : 0;
  const maxStock = variant ? maxPurchasableQty(variant) : hasVariants ? 0 : product.inStock ? MAX_LINE_QTY : 0;
  const maxQty = Math.max(1, Math.min(maxStock, MAX_LINE_QTY));
  const soldOut = hasVariants ? Boolean(variant) && maxStock <= 0 : !product.inStock;
  const canAdd = (!hasVariants || Boolean(variant)) && !soldOut;
  const effectiveQty = Math.min(qty, maxQty);

  function choose(axis: string, value: string) {
    setError(null);
    setSelection((prev) => ({ ...prev, [axis]: value }));
  }

  function addToCart() {
    if (hasVariants && !complete) {
      setError("Silakan pilih semua opsi produk terlebih dahulu.");
      return;
    }
    if (hasVariants && !variant) {
      setError("Kombinasi pilihan ini tidak tersedia.");
      return;
    }
    if (soldOut) return;
    const limit = variant ? maxStock : null;
    const existing = cart.items.find((line) => line.productId === product.id && line.skuId === (variant?.id ?? null));
    if (limit !== null && existing && existing.qty >= capQty(limit, limit)) {
      setError(`Stok maksimal ${limit} sudah ada di keranjang.`);
      return;
    }
    cart.add({ productId: product.id, skuId: variant?.id ?? null }, effectiveQty, limit);
    setError(null);
    toast("Ditambahkan ke keranjang", { label: "Lihat keranjang", href: "/cart" });
  }

  return (
    <div>
      <h1 className="text-[28px] leading-tight font-semibold text-[#111] lg:text-[30px]">{product.name}</h1>
      <div className="mt-3">
        <PriceLine price={unitPrice} compareAtPrice={product.compareAtPrice && product.compareAtPrice > unitPrice ? product.compareAtPrice : null} stacked={false} large />
      </div>

      {product.optionAxes.map((axis) => {
        const id = `${baseId}-${axis.name}`;
        return (
          <div key={axis.name} className="mt-8 lg:mt-7">
            <label htmlFor={id} className="mb-2 block text-center text-[17px] font-semibold text-[#111] lg:text-left lg:text-[16px]">
              {axisLabel(axis.name)}
              <span className="text-[#e00]" aria-hidden>
                *
              </span>
            </label>
            <select
              id={id}
              required
              value={selection[axis.name] ?? ""}
              onChange={(event) => choose(axis.name, event.target.value)}
              className="store-select-pink h-[50px] w-full cursor-pointer border px-3 text-center text-[15px] lg:h-[44px] lg:text-left lg:text-[14px]"
            >
              <option value="">-- Silahkan Pilih --</option>
              {axis.values.map((value) => {
                const state = optionValueState(product.variants, selection, axis.name, value);
                return (
                  <option key={value} value={value} disabled={state === "none"}>
                    {value}
                    {state === "soldout" ? " — stok habis" : state === "none" ? " — tidak tersedia" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        );
      })}

      <table className="mt-10 w-full text-[15px] lg:mt-9 lg:text-[14px]">
        <tbody>
          <tr className="border-t border-[#ccc]">
            <th scope="row" className="px-1 py-3 text-left font-normal lg:px-1">Biaya Tambahan:</th>
            <td className="px-1 py-3 text-right font-semibold">{formatRupiah(extra)}</td>
          </tr>
          <tr className="border-t border-[#ccc]">
            <th scope="row" className="px-1 py-3 text-left font-normal">Harga Produk:</th>
            <td className="px-1 py-3 text-right font-semibold">{formatRupiah(unitPrice)}</td>
          </tr>
          <tr className="border-t border-[#ccc]">
            <th scope="row" className="px-1 py-3 text-left font-normal">Total:</th>
            <td className="px-1 py-3 text-right font-semibold">{formatRupiah(unitPrice * effectiveQty)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-1 space-y-1 text-[13px] text-[#555]" aria-live="polite">
        {variant ? (
          <>
            <p>
              Stok tersedia untuk dikirim: <strong className="text-[#111]">{variant.shipStock}</strong>
            </p>
            {pickupPoints.length > 0 ? (
              <p>
                Ambil di toko: <span className="text-[#111]">{pickupStockSummary(variant, pickupPoints)}</span>
              </p>
            ) : null}
          </>
        ) : hasVariants ? (
          <p>Pilih {product.optionAxes.map((a) => axisLabel(a.name)).join(" & ")} untuk melihat stok.</p>
        ) : (
          <p>{product.inStock ? "Stok tersedia" : "Stok habis"}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 lg:gap-2">
        <QtyStepper value={effectiveQty} onChange={setQty} max={maxQty} />
        <button
          type="button"
          onClick={addToCart}
          disabled={!canAdd}
          aria-disabled={!canAdd}
          className="h-[44px] flex-1 rounded-[8px] bg-[var(--store-pink)] px-5 text-[14px] font-semibold tracking-[0.04em] text-white uppercase transition hover:bg-[var(--store-pink-dark)] disabled:cursor-not-allowed disabled:opacity-50 lg:h-[28px] lg:flex-none lg:rounded-[5px] lg:px-2 lg:text-[11px]"
        >
          {soldOut ? "Stok habis" : "Tambah ke keranjang"}
        </button>
        <WishlistButton product={product} className="hidden lg:flex" />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[14px] text-[#c00]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
