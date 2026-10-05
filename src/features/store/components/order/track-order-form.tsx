"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { normalizeIndonesianPhone } from "@/lib/store/types";
import { useStore } from "@/features/store/components/store-context";

export function TrackOrderForm() {
  const router = useRouter();
  const { href } = useStore();
  const orderId = useId();
  const phoneId = useId();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!orderNumber.trim()) {
      setError("Nomor order wajib diisi.");
      return;
    }
    if (!normalizeIndonesianPhone(phone)) {
      setError("Nomor WhatsApp tidak valid (contoh 0812xxxxxxxx).");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/public/store/order-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: orderNumber.trim(), phone: phone.trim() }),
      });
      const json = (await response.json().catch(() => null)) as { success: boolean; data?: { token: string }; error?: string } | null;
      if (!json?.success || !json.data) {
        setError(json?.error ?? "Pesanan tidak ditemukan.");
        setBusy(false);
        return;
      }
      router.push(href(`/order/${json.data.token}`));
    } catch {
      setError("Koneksi bermasalah — coba lagi.");
      setBusy(false);
    }
  }

  const inputClass = "h-[48px] w-full rounded-[4px] border px-3 text-[15px]";
  return (
    <form onSubmit={submit} noValidate className="space-y-5 border border-[var(--store-border)] p-6">
      <div>
        <label htmlFor={orderId} className="mb-1.5 block text-[14px] font-semibold">
          Nomor order
        </label>
        <input
          id={orderId}
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="Contoh: SHOP-261005-00001"
          autoComplete="off"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={phoneId} className="mb-1.5 block text-[14px] font-semibold">
          Nomor WhatsApp
        </label>
        <input
          id={phoneId}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0812xxxxxxxx"
          autoComplete="tel"
          className={inputClass}
        />
      </div>
      {error ? (
        <p role="alert" className="text-[14px] text-[#c00]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="flex h-[50px] w-full items-center justify-center gap-2 rounded-md bg-[var(--store-pink)] text-[15px] font-semibold tracking-[0.04em] text-white uppercase hover:bg-[var(--store-pink-dark)] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        {busy ? "Mencari…" : "Cek pesanan"}
      </button>
    </form>
  );
}
