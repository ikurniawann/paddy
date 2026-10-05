import { AlertTriangle, CheckCircle2, CreditCard, Landmark, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/store/types";
import { StoreLink } from "@/features/store/components/store-context";
import type { CartRow } from "@/features/store/components/cart/use-cart-snapshot";

/** Kolom kanan checkout: ringkasan pesanan, info pembayaran, tombol kirim. */
export function OrderSummary({
  rows,
  subtotal,
  shippingLabel,
  total,
  onlinePayment,
  serverError,
  submitting,
  disabled,
}: {
  rows: CartRow[];
  subtotal: number;
  shippingLabel: string;
  total: number;
  onlinePayment: boolean;
  serverError: string | null;
  submitting: boolean;
  disabled: boolean;
}) {
  return (
    <aside aria-label="Ringkasan pesanan" className="h-fit space-y-5 lg:sticky lg:top-[120px]">
      <div className="border border-[var(--store-border)] p-5 lg:p-6">
        <h2 className="border-b-2 border-[#111] pb-3 text-[16px] font-semibold tracking-[0.04em] uppercase">Pesanan kamu</h2>
        <ul className="divide-y divide-[var(--store-border)]">
          {rows.map((row) => (
            <li key={row.key} className="flex gap-3 py-3">
              <div className="h-14 w-14 shrink-0 border border-[var(--store-border)] bg-white">
                {row.line.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.line.imageUrl} alt="" width={56} height={56} loading="lazy" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 text-[14px]">
                <p className="line-clamp-2 font-semibold text-[#111]">{row.line.name}</p>
                {row.line.variantName ? <p className="text-[13px] text-[#666]">{row.line.variantName}</p> : null}
                <p className="text-[13px] text-[#666]">
                  {row.item.qty} × {formatRupiah(row.line.price)}
                </p>
              </div>
              <span className="shrink-0 text-[14px] font-semibold">{formatRupiah(row.line.price * row.item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-2 border-t border-[var(--store-border)] pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatRupiah(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Ongkos kirim</dt>
            <dd>{shippingLabel}</dd>
          </div>
          <div className="flex justify-between border-t border-[var(--store-border)] pt-3 text-[18px]">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold text-[var(--store-pink)]">{formatRupiah(total)}</dd>
          </div>
        </dl>
      </div>
    
      <div className="rounded-md border border-[var(--store-pink-soft)] bg-[var(--store-pink-tint)] p-4 text-[14px] text-[#333]">
        {onlinePayment ? (
          <p className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-[var(--store-pink)]" aria-hidden />
            <span>
              <strong>Pembayaran online</strong> (QRIS, Virtual Account, e-wallet, kartu) via Xendit. Kamu akan diarahkan ke halaman pembayaran setelah pesanan dibuat.
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2">
            <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-[var(--store-pink)]" aria-hidden />
            <span>
              <strong>Transfer bank manual</strong> — instruksi &amp; nomor rekening tampil setelah pesanan dibuat. Batas pembayaran 24 jam, lalu unggah bukti transfer.
            </span>
          </p>
        )}
      </div>
    
      {serverError ? (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {serverError}
        </p>
      ) : null}
    
      <button
        type="submit"
        disabled={disabled}
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-md bg-[var(--store-pink)] text-[16px] font-semibold tracking-[0.04em] text-white uppercase transition hover:bg-[var(--store-pink-dark)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-5 w-5" aria-hidden />}
        {submitting ? "Memproses…" : "Buat pesanan"}
      </button>
      <p className="text-center text-[12px] text-[#777]">
        Dengan membuat pesanan kamu menyetujui ketentuan belanja Paddy. Butuh bantuan?{" "}
        <StoreLink href="/contact-us" className="text-[var(--store-pink)] underline">
          Hubungi kami
        </StoreLink>
      </p>
    </aside>
  );
}
