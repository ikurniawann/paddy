"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, CreditCard, MapPin, Package, Store, Truck, XCircle } from "lucide-react";
import type { StoreOrderView } from "@/lib/store/checkout-server";
import { formatRupiah, type StoreBankAccount } from "@/lib/store/types";
import { StoreLink } from "@/features/store/components/store-context";
import { CopyButton, ManualTransferPanel } from "@/features/store/components/order/payment-panel";
import { orderStatusLabel, orderStatusTone, orderStepIndex, orderSteps, type OrderTone } from "@/features/store/lib/order-status";

const POLL_MS = 10_000;

const TONE_CLASS: Record<OrderTone, string> = {
  amber: "bg-amber-100 text-amber-900",
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
  gray: "bg-gray-100 text-gray-700",
  red: "bg-red-100 text-red-800",
};

function StatusTimeline({ order }: { order: StoreOrderView }) {
  const steps = orderSteps(order.shippingMethod);
  const current = orderStepIndex(order.status, order.shippingMethod);
  if (current < 0) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-[14px] text-red-800">
        <XCircle className="h-5 w-5" aria-hidden />
        Pesanan {orderStatusLabel(order.status).toLowerCase()}. Hubungi kami bila ada pertanyaan.
      </p>
    );
  }
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Tahapan pesanan">
      {steps.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step.key} className="flex flex-col items-center text-center" aria-current={index === current ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={`h-[3px] flex-1 ${index === 0 ? "opacity-0" : done ? "bg-[var(--store-pink)]" : "bg-[#e5e5e5]"}`} />
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  done ? "bg-[var(--store-pink)] text-white" : "bg-[#eee] text-[#999]"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              <span className={`h-[3px] flex-1 ${index === steps.length - 1 ? "opacity-0" : index < current ? "bg-[var(--store-pink)]" : "bg-[#e5e5e5]"}`} />
            </div>
            <span className={`mt-2 text-[11px] leading-tight sm:text-[13px] ${done ? "font-semibold text-[#111]" : "text-[#999]"}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ShippingBlock({ order }: { order: StoreOrderView }) {
  if (order.shippingMethod === "pickup") {
    return (
      <section className="border border-[var(--store-border)] p-5 lg:p-6" aria-labelledby="shipping-title">
        <h2 id="shipping-title" className="mb-3 flex items-center gap-2 text-[17px] font-semibold text-[#111]">
          <Store className="h-5 w-5 text-[var(--store-pink)]" aria-hidden /> Ambil di toko
        </h2>
        {order.pickupPoint ? (
          <div className="space-y-1 text-[14px] text-[#444]">
            <p className="text-[15px] font-semibold text-[#111]">{order.pickupPoint.name}</p>
            <p className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {order.pickupPoint.address}
            </p>
            {order.pickupPoint.openingHours ? (
              <p className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                {order.pickupPoint.openingHours}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[14px] text-[#444]">{order.courierService}</p>
        )}
        <p className="mt-4 rounded-md bg-[var(--store-pink-tint)] px-4 py-3 text-[14px] text-[#333]">
          Tunjukkan nomor order <strong>{order.orderNumber}</strong> saat mengambil pesanan.
        </p>
      </section>
    );
  }
  return (
    <section className="border border-[var(--store-border)] p-5 lg:p-6" aria-labelledby="shipping-title">
      <h2 id="shipping-title" className="mb-3 flex items-center gap-2 text-[17px] font-semibold text-[#111]">
        <Truck className="h-5 w-5 text-[var(--store-pink)]" aria-hidden /> Pengiriman
      </h2>
      <div className="space-y-1 text-[14px] text-[#444]">
        <p className="font-semibold text-[#111]">{order.customerName}</p>
        <p>{order.customerPhone}</p>
        {order.shippingAddress ? <p>{order.shippingAddress}</p> : null}
        <p>
          {[order.destinationCity, order.destinationProvince, order.postalCode].filter(Boolean).join(", ")}
        </p>
        {order.courierService ? <p className="pt-2 text-[13px] text-[#666]">Layanan: {order.courierService}</p> : null}
        {order.waybill ? (
          <p className="flex flex-wrap items-center gap-2 pt-1">
            No. resi: <strong className="text-[#111]">{order.waybill}</strong>
            <CopyButton value={order.waybill} label="Salin nomor resi" />
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function OrderView({
  token,
  initial,
  bankAccounts,
  whatsapp,
}: {
  token: string;
  initial: StoreOrderView;
  bankAccounts: StoreBankAccount[];
  whatsapp: string;
}) {
  const [order, setOrder] = useState(initial);
  const [proofOverride, setProofOverride] = useState(false);
  const pending = order.status === "pending";

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/public/store/order/${token}`, { cache: "no-store" });
        const json = (await response.json().catch(() => null)) as { success: boolean; data?: StoreOrderView } | null;
        if (json?.success && json.data) setOrder(json.data);
      } catch {
        // jaringan putus sementara — coba lagi di interval berikutnya
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [pending, token]);

  const proofUploaded = order.proofUploaded || proofOverride;
  const tone = orderStatusTone(order.status);
  const created = new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

  return (
    <div className="space-y-6">
      <header className="border border-[var(--store-border)] p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] tracking-[0.06em] text-[#777] uppercase">Nomor order</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-[24px] font-bold text-[#111] lg:text-[28px]">{order.orderNumber}</h1>
              <CopyButton value={order.orderNumber} label="Salin nomor order" />
            </div>
            <p className="mt-1 text-[13px] text-[#777]">Dibuat {created} WIB</p>
          </div>
          <span className={`rounded-full px-4 py-1.5 text-[14px] font-semibold ${TONE_CLASS[tone]}`} role="status">
            {orderStatusLabel(order.status, order.shippingMethod)}
          </span>
        </div>
        <div className="mt-6">
          <StatusTimeline order={order} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {pending && order.paymentMethod === "xendit" ? (
            <section className="border border-[var(--store-border)] p-5 lg:p-6">
              <h2 className="mb-2 flex items-center gap-2 text-[17px] font-semibold text-[#111]">
                <CreditCard className="h-5 w-5 text-[var(--store-pink)]" aria-hidden /> Pembayaran online
              </h2>
              <p className="text-[14px] text-[#555]">Bayar dengan QRIS, Virtual Account, e-wallet, atau kartu melalui Xendit.</p>
              {order.invoiceUrl ? (
                <a
                  href={order.invoiceUrl}
                  className="mt-4 flex h-[50px] w-full items-center justify-center rounded-md bg-[var(--store-pink)] text-[16px] font-semibold tracking-[0.04em] text-white uppercase hover:bg-[var(--store-pink-dark)]"
                >
                  Bayar sekarang — {formatRupiah(order.total)}
                </a>
              ) : (
                <p className="mt-3 text-[14px] text-[#c00]">Tautan pembayaran tidak tersedia. Hubungi kami.</p>
              )}
            </section>
          ) : null}

          {pending && order.paymentMethod === "manual_transfer" ? (
            <ManualTransferPanel
              token={token}
              orderNumber={order.orderNumber}
              total={order.total}
              dueAt={order.paymentDueAt}
              bankAccounts={bankAccounts}
              whatsapp={whatsapp}
              proofUploaded={proofUploaded}
              onProofUploaded={() => setProofOverride(true)}
            />
          ) : null}

          {!pending && order.paidAt ? (
            <p className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[14px] text-green-800">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              Pembayaran diterima {new Date(order.paidAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })} WIB. Terima kasih!
            </p>
          ) : null}

          <ShippingBlock order={order} />
        </div>

        <aside className="h-fit border border-[var(--store-border)] p-5 lg:p-6" aria-labelledby="items-title">
          <h2 id="items-title" className="flex items-center gap-2 border-b-2 border-[#111] pb-3 text-[16px] font-semibold tracking-[0.04em] uppercase">
            <Package className="h-4 w-4" aria-hidden /> Rincian pesanan
          </h2>
          <ul className="divide-y divide-[var(--store-border)]">
            {order.items.map((item, index) => (
              <li key={`${item.productName}-${index}`} className="flex gap-3 py-3">
                <div className="h-14 w-14 shrink-0 border border-[var(--store-border)] bg-white">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" width={56} height={56} loading="lazy" className="h-full w-full object-contain" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="font-semibold text-[#111]">{item.productName}</p>
                  {item.skuName ? <p className="text-[13px] text-[#666]">{item.skuName}</p> : null}
                  <p className="text-[13px] text-[#666]">
                    {item.quantity} × {formatRupiah(item.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 text-[14px] font-semibold">{formatRupiah(item.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-[var(--store-border)] pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatRupiah(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ongkos kirim</dt>
              <dd>{order.shippingMethod === "pickup" ? "Gratis" : formatRupiah(order.shippingCost)}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--store-border)] pt-3 text-[18px]">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold text-[var(--store-pink)]">{formatRupiah(order.total)}</dd>
            </div>
          </dl>
          {order.notes ? (
            <p className="mt-4 rounded-md bg-[#f7f7f7] px-3 py-2 text-[13px] text-[#555]">
              <span className="font-semibold">Catatan:</span> {order.notes}
            </p>
          ) : null}
          <p className="mt-4 text-[12px] text-[#888]">
            Simpan halaman ini untuk memantau pesanan, atau cek lagi lewat{" "}
            <StoreLink href="/track-order" className="text-[var(--store-pink)] underline">
              Cek Pesanan
            </StoreLink>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
