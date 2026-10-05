"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Store, Truck } from "lucide-react";
import {
  formatRupiah,
  INDONESIA_PROVINCES,
  matchFlatZone,
  normalizeIndonesianPhone,
  type StoreFlatZone,
  type StorePickupPoint,
} from "@/lib/store/types";
import { StoreLink, useStore } from "@/features/store/components/store-context";
import { useHydrated } from "@/features/store/components/use-cart";
import { useCartSnapshot } from "@/features/store/components/cart/use-cart-snapshot";
import { Field, inputClass, MethodCard, SectionCard } from "@/features/store/components/checkout/fields";
import { PickupSelector, StockList } from "@/features/store/components/checkout/pickup-selector";
import { OrderSummary } from "@/features/store/components/checkout/order-summary";
import { cartFulfillable, cartSubtotal } from "@/features/store/lib/checkout";

type Method = "flat" | "pickup";

type CheckoutResponse =
  | { success: true; data: { order_number: string; token: string; invoice_url: string | null } }
  | { success: false; error: string };

export function CheckoutForm({
  zones,
  pickupPoints,
  onlinePayment,
}: {
  zones: StoreFlatZone[];
  pickupPoints: StorePickupPoint[];
  onlinePayment: boolean;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const { href } = useStore();
  const { cart, rows, loading, error: cartError } = useCartSnapshot();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<Method>("flat");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [address, setAddress] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const stockLines = rows.map((row) => ({ ...row.line, qty: row.item.qty }));
  const subtotal = cartSubtotal(rows.map((row) => ({ price: row.line.price, qty: row.item.qty })));
  const zone = method === "flat" ? matchFlatZone(province, zones) : null;
  const shipping = method === "flat" ? (zone?.price ?? 0) : 0;
  const total = subtotal + shipping;
  const shipOk = cartFulfillable(stockLines, "flat");
  const selectedPickupOk = warehouseId ? cartFulfillable(stockLines, "pickup", warehouseId) : false;
  const methodOk = method === "flat" ? shipOk : selectedPickupOk;

  if (!hydrated || (loading && rows.length === 0)) {
    return (
      <p className="py-24 text-center text-[15px] text-[var(--store-muted)]" aria-busy="true">
        Memuat checkout…
      </p>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-[22px] font-semibold text-[#111]">Keranjang kamu kosong</p>
        <p className="mt-2 text-[15px] text-[#555]">Tambahkan produk dulu sebelum checkout.</p>
        <StoreLink href="/shop" className="mt-6 inline-block rounded-md bg-[var(--store-pink)] px-8 py-3 text-[15px] font-semibold text-white uppercase hover:bg-[var(--store-pink-dark)]">
          Mulai belanja
        </StoreLink>
      </div>
    );
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Nama wajib diisi.";
    if (!normalizeIndonesianPhone(phone)) errors.phone = "Nomor WhatsApp tidak valid (contoh 0812xxxxxxxx).";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Format email tidak valid.";
    if (method === "flat") {
      if (!province) errors.province = "Pilih provinsi.";
      if (city.trim().length < 2) errors.city = "Kota/kabupaten wajib diisi.";
      if (address.trim().length < 10) errors.address = "Alamat lengkap minimal 10 karakter.";
      if (postal.trim() && !/^\d{5}$/.test(postal.trim())) errors.postal = "Kode pos 5 digit.";
    } else if (!warehouseId) {
      errors.pickup = "Pilih toko pengambilan.";
    }
    return errors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = document.getElementById(id(Object.keys(errors)[0]));
      first?.focus();
      return;
    }
    if (!methodOk) {
      setServerError(
        method === "flat"
          ? "Sebagian produk tidak cukup stok untuk dikirim. Kurangi jumlah atau pilih ambil di toko."
          : "Toko yang dipilih tidak bisa memenuhi semua produk di keranjang."
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/public/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((row) => ({ product_id: row.line.productId, sku_id: row.line.skuId, quantity: row.item.qty })),
          customer: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
          shipping:
            method === "pickup"
              ? { method: "pickup", warehouse_id: warehouseId }
              : {
                  method: "flat",
                  province,
                  city: city.trim(),
                  postal_code: postal.trim() || undefined,
                  address: address.trim(),
                },
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await response.json().catch(() => null)) as CheckoutResponse | null;
      if (!json || !json.success) {
        setServerError(json && !json.success ? json.error : "Checkout gagal — coba lagi.");
        setSubmitting(false);
        return;
      }
      cart.clear();
      if (json.data.invoice_url) {
        window.location.href = json.data.invoice_url;
      } else {
        router.push(href(`/order/${json.data.token}`));
      }
    } catch {
      setServerError("Koneksi bermasalah — periksa internet kamu lalu coba lagi.");
      setSubmitting(false);
    }
  }

  const errorProps = (key: string) =>
    fieldErrors[key] ? { "aria-invalid": true as const, "aria-describedby": `${id(key)}-error` } : {};

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        {cartError ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
            {cartError}
          </p>
        ) : null}

        <SectionCard step={1} title="Data Pembeli">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id={id("name")} label="Nama lengkap" required error={fieldErrors.name}>
                <input id={id("name")} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} {...errorProps("name")} />
              </Field>
            </div>
            <Field id={id("phone")} label="Nomor WhatsApp" required hint="Untuk konfirmasi & info pesanan." error={fieldErrors.phone}>
              <input
                id={id("phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0812xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                {...errorProps("phone")}
              />
            </Field>
            <Field id={id("email")} label="Email" error={fieldErrors.email}>
              <input id={id("email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} {...errorProps("email")} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard step={2} title="Pengiriman">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Metode pengiriman">
            <MethodCard
              active={method === "flat"}
              onSelect={() => setMethod("flat")}
              icon={<Truck className="h-5 w-5" />}
              title="Kirim ke alamat"
              subtitle="Ongkir flat sesuai provinsi"
            />
            <MethodCard
              active={method === "pickup"}
              onSelect={() => setMethod("pickup")}
              icon={<Store className="h-5 w-5" />}
              title="Ambil di toko"
              subtitle="Gratis ongkir — ambil di toko Paddy"
            />
          </div>

          {method === "flat" ? (
            <div className="mt-6 space-y-4">
              {!shipOk && rows.length > 0 ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-[14px] text-amber-900">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" aria-hidden /> Stok untuk pengiriman tidak mencukupi
                  </p>
                  <StockList rows={rows} method="flat" warehouseId={null} />
                  <p className="mt-2">Kurangi jumlah di keranjang atau pilih &ldquo;Ambil di toko&rdquo;.</p>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={id("province")} label="Provinsi" required error={fieldErrors.province}>
                  <select id={id("province")} value={province} onChange={(e) => setProvince(e.target.value)} className={inputClass} {...errorProps("province")}>
                    <option value="">-- Pilih provinsi --</option>
                    {INDONESIA_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={id("city")} label="Kota / Kabupaten" required error={fieldErrors.city}>
                  <input id={id("city")} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} {...errorProps("city")} />
                </Field>
                <div className="sm:col-span-2">
                  <Field id={id("address")} label="Alamat lengkap" required hint="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan." error={fieldErrors.address}>
                    <textarea
                      id={id("address")}
                      rows={3}
                      autoComplete="street-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-[4px] border px-3 py-2 text-[15px]"
                      {...errorProps("address")}
                    />
                  </Field>
                </div>
                <Field id={id("postal")} label="Kode pos" error={fieldErrors.postal}>
                  <input
                    id={id("postal")}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    value={postal}
                    onChange={(e) => setPostal(e.target.value.replace(/\D/g, ""))}
                    className={inputClass}
                    {...errorProps("postal")}
                  />
                </Field>
              </div>
              <div className="rounded-md bg-[#f7f7f7] px-4 py-3 text-[14px]" aria-live="polite">
                {province ? (
                  zone ? (
                    <p>
                      Ongkir flat <strong>{zone.name}</strong>: <strong>{formatRupiah(zone.price)}</strong>
                      {zone.etaLabel ? <span className="text-[#666]"> · estimasi {zone.etaLabel}</span> : null}
                    </p>
                  ) : (
                    <p className="text-[#c00]">Pengiriman ke provinsi ini belum tersedia.</p>
                  )
                ) : (
                  <p className="text-[#666]">Pilih provinsi untuk melihat ongkos kirim.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {fieldErrors.pickup ? (
                <p id={`${id("pickup")}-error`} className="mb-2 text-[13px] text-[#c00]">
                  {fieldErrors.pickup}
                </p>
              ) : null}
              <PickupSelector
                points={pickupPoints}
                rows={rows}
                stockLines={stockLines}
                warehouseId={warehouseId}
                onSelect={setWarehouseId}
                groupId={id("pickup")}
              />
            </div>
          )}
        </SectionCard>

        <SectionCard step={3} title="Catatan">
          <label htmlFor={id("notes")} className="sr-only">
            Catatan pesanan
          </label>
          <textarea
            id={id("notes")}
            rows={3}
            maxLength={500}
            placeholder="Catatan untuk pesanan (opsional), mis. warna cadangan atau waktu pengambilan."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-[4px] border px-3 py-2 text-[15px]"
          />
        </SectionCard>
      </div>

      <OrderSummary
        rows={rows}
        subtotal={subtotal}
        shippingLabel={method === "pickup" ? "Gratis (ambil di toko)" : zone ? formatRupiah(zone.price) : "—"}
        total={total}
        onlinePayment={onlinePayment}
        serverError={serverError}
        submitting={submitting}
        disabled={submitting || loading || rows.length === 0}
      />
    </form>
  );
}
