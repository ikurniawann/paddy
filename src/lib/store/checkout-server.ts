// Website toko publik (EPIC-054) — checkout, status pesanan, bukti transfer.
//
// Alur: validasi baris dari DB (harga tidak dipercaya dari klien) → klaim stok
// di lokasi pemenuhan (ambil di toko = stok toko itu; kirim = lokasi utama /
// Gudang Pusat) → order + reservasi dalam satu transaksi → pembayaran:
//   - Xendit terkonfigurasi → invoice online (2 jam)
//   - belum → transfer manual: batas bayar 24 jam, pembeli unggah bukti,
//     admin konfirmasi di Ecommerce → Pesanan.
// Reservasi kedaluwarsa dilepas shop.release_expired_reservations().

import { query, queryOne, withTransaction } from "@/lib/db";
import { createInvoice, isXenditConfigured } from "@/lib/xendit/client";
import {
  claimLine,
  resolveLines,
  restoreClaims,
  SHOP_INVOICE_PREFIX,
  type ClaimRef,
} from "@/lib/shop/storefront-server";
import { listFlatZones } from "@/lib/store/catalog-server";
import {
  INDONESIA_PROVINCES,
  matchFlatZone,
  normalizeIndonesianPhone,
  type StoreShippingMethod,
} from "@/lib/store/types";
import { savePrivateImage } from "@/lib/storage-private";

export const STORE_STOREFRONT_SLUG = process.env.STORE_STOREFRONT_SLUG || "toko";
export const MANUAL_TRANSFER_HOURS = 24;
const ONLINE_INVOICE_HOURS = 2;

export type StoreCheckoutInput = {
  items: Array<{ product_id: string; sku_id?: string | null; quantity: number }>;
  customer: { name: string; phone: string; email?: string | null };
  shipping:
    | { method: "pickup"; warehouse_id: string }
    | { method: "flat"; province: string; city: string; postal_code?: string | null; address: string };
  notes?: string | null;
  /** Origin website toko (untuk redirect Xendit ke halaman status). */
  storeOrigin: string;
};

export type StoreCheckoutResult =
  | { ok: true; orderNumber: string; accessToken: string; invoiceUrl: string | null }
  | { ok: false; status: number; reason: string };

export class StoreError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function processStoreCheckout(input: StoreCheckoutInput): Promise<StoreCheckoutResult> {
  const name = input.customer.name.trim();
  const phone = normalizeIndonesianPhone(input.customer.phone);
  if (name.length < 2) return { ok: false, status: 400, reason: "Nama penerima wajib diisi" };
  if (!phone) return { ok: false, status: 400, reason: "Nomor WhatsApp tidak valid (contoh 0812xxxxxxxx)" };

  const storefront = await queryOne<{ id: string; name: string }>(
    `SELECT id, name FROM shop.storefronts WHERE lower(slug) = lower($1) AND is_active`,
    [STORE_STOREFRONT_SLUG]
  );
  if (!storefront) return { ok: false, status: 503, reason: "Toko online belum aktif" };

  // ── Pengiriman ────────────────────────────────────────────────────────────
  let shippingMethod: StoreShippingMethod;
  let shippingCost = 0;
  let warehouseId: string | null = null;
  let locationLabel = "Gudang Pusat";
  let address = "";
  let province: string | null = null;
  let city: string | null = null;
  let postalCode: string | null = null;
  let courierService = "";
  if (input.shipping.method === "pickup") {
    const point = await queryOne<{ warehouse_id: string; name: string; address: string; city: string }>(
      `SELECT warehouse_id, name, address, city FROM shop.pickup_points WHERE warehouse_id = $1 AND is_active`,
      [input.shipping.warehouse_id]
    );
    if (!point) return { ok: false, status: 400, reason: "Toko pengambilan tidak tersedia" };
    shippingMethod = "pickup";
    warehouseId = point.warehouse_id;
    locationLabel = point.name;
    address = `Ambil di ${point.name} — ${point.address}`;
    city = point.city;
    courierService = point.name;
  } else {
    const ship = input.shipping;
    const prov = INDONESIA_PROVINCES.find((p) => p.toLowerCase() === ship.province?.trim().toLowerCase());
    if (!prov) return { ok: false, status: 400, reason: "Provinsi tujuan tidak valid" };
    if ((ship.address ?? "").trim().length < 10) {
      return { ok: false, status: 400, reason: "Alamat lengkap minimal 10 karakter" };
    }
    if ((ship.city ?? "").trim().length < 2) {
      return { ok: false, status: 400, reason: "Kota/kabupaten wajib diisi" };
    }
    const zone = matchFlatZone(prov, await listFlatZones());
    if (!zone) return { ok: false, status: 400, reason: "Pengiriman ke provinsi ini belum tersedia" };
    shippingMethod = "flat";
    shippingCost = zone.price;
    province = prov;
    city = ship.city.trim();
    postalCode = ship.postal_code?.trim() || null;
    address = ship.address.trim();
    courierService = `${zone.code}${zone.etaLabel ? ` · ${zone.etaLabel}` : ""}`;
  }

  // ── Baris & stok ──────────────────────────────────────────────────────────
  const resolved = await resolveLines(input.items);
  if (!resolved.ok) return { ok: false, status: 400, reason: resolved.reason };
  const lines = resolved.lines;

  await query("SELECT shop.release_expired_reservations()").catch(() => {});
  const claims: ClaimRef[] = [];
  for (const line of lines) {
    const claim: ClaimRef = { productId: line.productId, skuId: line.skuId, qty: line.quantity, warehouseId };
    const result = await claimLine(claim);
    if (!result.success) {
      await restoreClaims(claims);
      const label = line.skuName ? `${line.productName} (${line.skuName})` : line.productName;
      return {
        ok: false,
        status: 409,
        reason:
          result.reason === "sku_not_found"
            ? `${label} sudah tidak tersedia — muat ulang keranjang`
            : `Stok ${label} tidak cukup di ${locationLabel}`,
      };
    }
    claims.push(claim);
  }

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const total = subtotal + shippingCost;
  const online = isXenditConfigured();
  const hours = online ? ONLINE_INVOICE_HOURS : MANUAL_TRANSFER_HOURS;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  let orderId = "";
  let orderNumber = "";
  let accessToken = "";
  try {
    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; order_number: string; access_token: string }>(
        `INSERT INTO shop.orders (
           storefront_id, customer_name, customer_phone, customer_email,
           shipping_address, shipping_postal_code, shipping_provider, courier_code, courier_service,
           subtotal, shipping_cost, total, invoice_expires_at, payment_due_at, notes,
           source_channel, payment_method, shipping_method, fulfillment_warehouse_id,
           destination_province, destination_city
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,'web',$15,$16,$17,$18,$19)
         RETURNING id, order_number, access_token`,
        [
          storefront.id, name, phone, input.customer.email?.trim() || null,
          address, postalCode, shippingMethod, shippingMethod === "pickup" ? "PICKUP" : "FLAT", courierService,
          subtotal, shippingCost, total, expiresAt, input.notes?.trim()?.slice(0, 500) || null,
          online ? "xendit" : "manual_transfer", shippingMethod, warehouseId, province, city,
        ]
      );
      orderId = rows[0].id;
      orderNumber = rows[0].order_number;
      accessToken = rows[0].access_token;
      for (const line of lines) {
        await client.query(
          `INSERT INTO shop.order_items (order_id, product_id, sku_id, product_name, sku_name, sku_code,
             quantity, unit_price, total, weight_gram)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [orderId, line.productId, line.skuId, line.productName, line.skuName, line.skuCode,
           line.quantity, line.unitPrice, line.unitPrice * line.quantity, line.weightGram]
        );
      }
      for (const claim of claims) {
        await client.query(
          `INSERT INTO shop.stock_reservations (order_id, product_id, sku_id, qty, expires_at, warehouse_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, claim.productId, claim.skuId, claim.qty, expiresAt, warehouseId]
        );
      }
    });
  } catch (error) {
    console.error("[store] checkout insert failed:", error);
    await restoreClaims(claims);
    return { ok: false, status: 500, reason: "Gagal membuat pesanan — coba lagi" };
  }

  if (!online) return { ok: true, orderNumber, accessToken, invoiceUrl: null };

  try {
    const invoice = await createInvoice({
      externalId: `${SHOP_INVOICE_PREFIX}${orderId}`,
      amount: total,
      payerName: name,
      description: `Order ${orderNumber} — ${storefront.name}`,
      redirectUrl: `${input.storeOrigin}/order/${accessToken}`,
    });
    await query(
      `UPDATE shop.orders SET xendit_invoice_id = $2, xendit_invoice_url = $3, updated_at = now() WHERE id = $1`,
      [orderId, invoice.invoiceId, invoice.invoiceUrl]
    );
    return { ok: true, orderNumber, accessToken, invoiceUrl: invoice.invoiceUrl };
  } catch (error) {
    console.error(`[store] xendit invoice failed for ${orderId}:`, error);
    await restoreClaims(claims);
    await query(`UPDATE shop.stock_reservations SET status='released', updated_at=now() WHERE order_id=$1 AND status='held'`, [orderId]).catch(() => {});
    await query(`UPDATE shop.orders SET status='cancelled', updated_at=now() WHERE id=$1`, [orderId]).catch(() => {});
    return { ok: false, status: 502, reason: "Gagal membuat tagihan pembayaran — coba lagi" };
  }
}

export type StoreOrderView = {
  orderNumber: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: "xendit" | "manual_transfer";
  paymentDueAt: string | null;
  paidAt: string | null;
  invoiceUrl: string | null;
  proofUploaded: boolean;
  shippingMethod: StoreShippingMethod;
  shippingAddress: string | null;
  destinationCity: string | null;
  destinationProvince: string | null;
  postalCode: string | null;
  pickupPoint: { name: string; address: string; openingHours: string | null } | null;
  courierService: string | null;
  waybill: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  notes: string | null;
  items: Array<{ productName: string; skuName: string | null; quantity: number; unitPrice: number; total: number; imageUrl: string | null }>;
};

/** Status pesanan untuk pembeli (via access token di URL). */
export async function getStoreOrder(token: string): Promise<StoreOrderView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  await query("SELECT shop.release_expired_reservations()").catch(() => {});
  const order = await queryOne<{
    id: string; order_number: string; status: string; created_at: string; customer_name: string; customer_phone: string;
    payment_method: "xendit" | "manual_transfer"; payment_due_at: string | null; paid_at: string | null;
    xendit_invoice_url: string | null; payment_proof_url: string | null; shipping_method: StoreShippingMethod;
    shipping_address: string | null; destination_city: string | null; destination_province: string | null;
    shipping_postal_code: string | null; courier_service: string | null; waybill: string | null;
    subtotal: string; shipping_cost: string; total: string; notes: string | null;
    pickup_name: string | null; pickup_address: string | null; pickup_hours: string | null;
  }>(
    `SELECT o.id, o.order_number, o.status, o.created_at, o.customer_name, o.customer_phone, o.payment_method,
            o.payment_due_at, o.paid_at, o.xendit_invoice_url, o.payment_proof_url, o.shipping_method,
            o.shipping_address, o.destination_city, o.destination_province, o.shipping_postal_code,
            o.courier_service, o.waybill, o.subtotal, o.shipping_cost, o.total, o.notes,
            pt.name AS pickup_name, pt.address AS pickup_address, pt.opening_hours AS pickup_hours
     FROM shop.orders o
     LEFT JOIN shop.pickup_points pt ON pt.warehouse_id = o.fulfillment_warehouse_id AND o.shipping_method = 'pickup'
     WHERE o.access_token = $1`,
    [token]
  );
  if (!order) return null;
  const items = await query<{ product_name: string; sku_name: string | null; quantity: string; unit_price: string; total: string; image_url: string | null }>(
    `SELECT i.product_name, i.sku_name, i.quantity, i.unit_price, i.total, pp.image_url
     FROM shop.order_items i LEFT JOIN pos.pos_products pp ON pp.id = i.product_id
     WHERE i.order_id = $1 ORDER BY i.product_name`,
    [order.id]
  );
  // Nomor WA dimasking: halaman status bisa dibuka siapa pun yang punya tautan.
  const maskedPhone = order.customer_phone.replace(/(\d{4})\d+(\d{3})$/, "$1•••••$2");
  return {
    orderNumber: order.order_number,
    status: order.status,
    createdAt: order.created_at,
    customerName: order.customer_name,
    customerPhone: maskedPhone,
    paymentMethod: order.payment_method,
    paymentDueAt: order.payment_due_at,
    paidAt: order.paid_at,
    invoiceUrl: order.status === "pending" ? order.xendit_invoice_url : null,
    proofUploaded: Boolean(order.payment_proof_url),
    shippingMethod: order.shipping_method,
    shippingAddress: order.shipping_method === "pickup" ? null : order.shipping_address,
    destinationCity: order.destination_city,
    destinationProvince: order.destination_province,
    postalCode: order.shipping_postal_code,
    pickupPoint: order.pickup_name
      ? { name: order.pickup_name, address: order.pickup_address ?? "", openingHours: order.pickup_hours }
      : null,
    courierService: order.courier_service,
    waybill: order.waybill,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shipping_cost),
    total: Number(order.total),
    notes: order.notes,
    items: items.map((item) => ({
      productName: item.product_name,
      skuName: item.sku_name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      total: Number(item.total),
      imageUrl: item.image_url,
    })),
  };
}

/** Cari pesanan dengan nomor order + nomor WA (pembeli kehilangan tautan). */
export async function findStoreOrderToken(orderNumber: string, phone: string): Promise<string | null> {
  const normalized = normalizeIndonesianPhone(phone);
  if (!normalized || !orderNumber.trim()) return null;
  const row = await queryOne<{ access_token: string }>(
    `SELECT access_token FROM shop.orders
     WHERE upper(order_number) = upper($1) AND customer_phone = $2 AND source_channel = 'web'`,
    [orderNumber.trim(), normalized]
  );
  return row?.access_token ?? null;
}

const PROOF_MAX_BYTES = 5 * 1024 * 1024;

/** Unggah bukti transfer (hanya pesanan transfer manual yang masih menunggu). */
export async function uploadPaymentProof(token: string, file: File): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new StoreError("Pesanan tidak ditemukan", 404);
  const order = await queryOne<{ id: string; status: string; payment_method: string }>(
    `SELECT id, status, payment_method FROM shop.orders WHERE access_token = $1`,
    [token]
  );
  if (!order) throw new StoreError("Pesanan tidak ditemukan", 404);
  if (order.payment_method !== "manual_transfer") throw new StoreError("Pesanan ini dibayar online");
  if (order.status !== "pending") throw new StoreError("Pesanan tidak lagi menunggu pembayaran");
  if (file.size > PROOF_MAX_BYTES) throw new StoreError("Ukuran bukti maksimal 5 MB");
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await savePrivateImage(buffer, file.type, "shop-payment-proofs");
  if (!saved.path) throw new StoreError(saved.error ?? "Gagal menyimpan bukti transfer");
  await query(
    `UPDATE shop.orders SET payment_proof_url = $2, payment_proof_uploaded_at = now(), updated_at = now() WHERE id = $1`,
    [order.id, saved.path]
  );
}
