"use client";

import { AlertTriangle, ShoppingBag, Trash2, X } from "lucide-react";
import { formatRupiah } from "@/lib/store/types";
import { StoreLink } from "@/features/store/components/store-context";
import { useHydrated } from "@/features/store/components/use-cart";
import { QtyStepper } from "@/features/store/components/product/product-purchase";
import { useCartSnapshot, type CartRow } from "@/features/store/components/cart/use-cart-snapshot";
import { cartSubtotal } from "@/features/store/lib/checkout";
import { MAX_LINE_QTY } from "@/features/store/lib/cart";

function LineImage({ row }: { row: CartRow }) {
  return (
    <StoreLink href={`/product/${row.line.slug}`} className="block h-[84px] w-[84px] shrink-0 border border-[var(--store-border)] bg-white">
      {row.line.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.line.imageUrl} alt={row.line.name} width={84} height={84} loading="lazy" className="h-full w-full object-contain" />
      ) : null}
    </StoreLink>
  );
}

function StockNote({ row }: { row: CartRow }) {
  if (row.soldOut) return <p className="mt-1 text-[13px] font-semibold text-[#c00]">Stok habis — hapus dari keranjang</p>;
  if (row.max !== null && row.max < 5) return <p className="mt-1 text-[13px] text-[#b45309]">Sisa stok {row.max}</p>;
  return null;
}

export function CartView() {
  const hydrated = useHydrated();
  const { cart, rows, loading, error, removed, dismissRemoved } = useCartSnapshot();
  const subtotal = cartSubtotal(rows.map((row) => ({ price: row.line.price, qty: row.item.qty })));
  const blocked = rows.some((row) => row.soldOut);

  if (!hydrated || (loading && rows.length === 0)) {
    return (
      <div className="py-24 text-center text-[15px] text-[var(--store-muted)]" aria-busy="true">
        Memuat keranjang…
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-[var(--store-pink-soft)]" strokeWidth={1.4} aria-hidden />
        <p className="mt-5 text-[22px] font-semibold text-[#111]">Keranjang kamu masih kosong</p>
        {removed > 0 ? (
          <p className="mt-2 text-[14px] text-[#b45309]">{removed} produk dihapus karena sudah tidak dijual.</p>
        ) : null}
        <p className="mt-2 max-w-md text-[15px] text-[#555]">Yuk, temukan case, tas, dan adorable goods favoritmu!</p>
        <StoreLink
          href="/shop"
          className="mt-7 rounded-md bg-[var(--store-pink)] px-8 py-3 text-[15px] font-semibold tracking-[0.03em] text-white uppercase hover:bg-[var(--store-pink-dark)]"
        >
          Mulai belanja
        </StoreLink>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <section aria-label="Isi keranjang">
        {removed > 0 ? (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1">{removed} produk dihapus dari keranjang karena sudah tidak dijual.</p>
            <button type="button" aria-label="Tutup" onClick={dismissRemoved}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
            {error}
          </p>
        ) : null}

        <div className="hidden grid-cols-[1fr_130px_130px_130px_40px] gap-4 border-b-2 border-[#111] pb-3 text-[14px] font-semibold tracking-[0.04em] uppercase md:grid">
          <span>Produk</span>
          <span className="text-right">Harga</span>
          <span className="text-center">Jumlah</span>
          <span className="text-right">Subtotal</span>
          <span className="sr-only">Hapus</span>
        </div>
        <ul>
          {rows.map((row) => (
            <li
              key={row.key}
              className="grid grid-cols-[84px_1fr] gap-4 border-b border-[var(--store-border)] py-5 md:grid-cols-[1fr_130px_130px_130px_40px] md:items-center"
            >
              <div className="contents md:flex md:items-center md:gap-4">
                <LineImage row={row} />
                <div className="min-w-0">
                  <StoreLink href={`/product/${row.line.slug}`} className="text-[16px] leading-snug font-semibold text-[#111] hover:text-[var(--store-pink)]">
                    {row.line.name}
                  </StoreLink>
                  {row.line.variantName ? <p className="mt-0.5 text-[14px] text-[#555]">{row.line.variantName}</p> : null}
                  <StockNote row={row} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 md:hidden">
                    <QtyStepper
                      size="sm"
                      value={row.item.qty}
                      max={row.max === null ? MAX_LINE_QTY : Math.max(1, row.max)}
                      onChange={(qty) => cart.setQty(row.key, qty)}
                      label={`Jumlah ${row.line.name}`}
                    />
                    <span className="text-[15px] font-bold">{formatRupiah(row.line.price * row.item.qty)}</span>
                    <button
                      type="button"
                      onClick={() => cart.remove(row.key)}
                      className="flex items-center gap-1 text-[13px] text-[#888] hover:text-[#c00]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Hapus
                    </button>
                  </div>
                </div>
              </div>
              <div className="hidden text-right md:block">
                {row.line.compareAtPrice ? (
                  <del className="block text-[13px] text-[#999]">{formatRupiah(row.line.compareAtPrice)}</del>
                ) : null}
                <span className="text-[15px]">{formatRupiah(row.line.price)}</span>
              </div>
              <div className="hidden justify-center md:flex">
                <QtyStepper
                  size="sm"
                  value={row.item.qty}
                  max={row.max === null ? MAX_LINE_QTY : Math.max(1, row.max)}
                  onChange={(qty) => cart.setQty(row.key, qty)}
                  label={`Jumlah ${row.line.name}`}
                />
              </div>
              <span className="hidden text-right text-[15px] font-bold md:block">{formatRupiah(row.line.price * row.item.qty)}</span>
              <button
                type="button"
                onClick={() => cart.remove(row.key)}
                aria-label={`Hapus ${row.line.name} dari keranjang`}
                className="hidden h-9 w-9 items-center justify-center rounded-full text-[#888] hover:bg-red-50 hover:text-[#c00] md:flex"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {loading ? <p className="mt-3 text-[13px] text-[var(--store-muted)]">Memperbarui harga & stok…</p> : null}
        <div className="mt-6">
          <StoreLink href="/shop" className="text-[15px] font-semibold text-[var(--store-pink)] hover:underline">
            ← Lanjut belanja
          </StoreLink>
        </div>
      </section>

      <aside aria-label="Ringkasan keranjang" className="h-fit border border-[var(--store-border)] p-6 lg:sticky lg:top-[120px]">
        <h2 className="border-b-2 border-[#111] pb-3 text-[16px] font-semibold tracking-[0.04em] uppercase">Total keranjang</h2>
        <dl className="mt-4 space-y-3 text-[15px]">
          <div className="flex justify-between">
            <dt>Subtotal ({cart.count} barang)</dt>
            <dd className="font-semibold">{formatRupiah(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-[#555]">
            <dt>Ongkos kirim</dt>
            <dd>Dihitung saat checkout</dd>
          </div>
          <div className="flex justify-between border-t border-[var(--store-border)] pt-3 text-[17px]">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold">{formatRupiah(subtotal)}</dd>
          </div>
        </dl>
        {blocked ? (
          <p className="mt-4 text-[13px] text-[#c00]">Hapus produk yang stoknya habis untuk melanjutkan.</p>
        ) : null}
        {blocked || loading ? (
          <span
            aria-disabled="true"
            className="mt-5 flex h-[50px] w-full cursor-not-allowed items-center justify-center rounded-md bg-[var(--store-pink)] text-[15px] font-semibold tracking-[0.04em] text-white uppercase opacity-50"
          >
            Lanjut ke Checkout
          </span>
        ) : (
          <StoreLink
            href="/checkout"
            className="mt-5 flex h-[50px] w-full items-center justify-center rounded-md bg-[var(--store-pink)] text-[15px] font-semibold tracking-[0.04em] text-white uppercase hover:bg-[var(--store-pink-dark)]"
          >
            Lanjut ke Checkout
          </StoreLink>
        )}
        <p className="mt-4 text-center text-[13px] text-[#777]">Kirim ke alamat (ongkir flat) atau ambil di toko Paddy.</p>
      </aside>
    </div>
  );
}
