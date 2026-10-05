// Efek samping setelah pesanan toko online lunas — dipakai webhook Xendit
// (EPIC-039) dan konfirmasi transfer manual oleh admin (EPIC-054).

import { query, queryOne } from "@/lib/db";
import { createPgClient } from "@/lib/pg/create-client";
import { syncPosCustomerOrderStats } from "@/lib/crm/loyalty-engine";
import { sendShopOrderPaidWa } from "@/lib/shop/shop-wa";
import { commitOrderReservations } from "@/lib/shop/storefront-server";

export type PaidShopOrder = {
  id: string;
  order_number: string;
  access_token: string;
  customer_name: string;
  customer_phone: string;
  total: string | number;
  shipping_method?: string | null;
};

/**
 * Commit reservasi stok, tautkan member CRM by nomor WA (statistik belanja,
 * TANPA XP — XP hanya utk ARK Coin, EPIC-011), lalu WA konfirmasi best-effort.
 */
export async function afterShopOrderPaid(order: PaidShopOrder): Promise<void> {
  await commitOrderReservations(order.id);

  try {
    const phone = order.customer_phone.replace(/\D/g, "");
    if (phone.length >= 8) {
      const member = await queryOne<{ id: string }>(
        `SELECT id FROM pos.pos_customers
         WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE '%' || $1
         LIMIT 1`,
        [phone.slice(-10)]
      );
      if (member) {
        await query("UPDATE shop.orders SET customer_id = $2::uuid WHERE id = $1::uuid", [order.id, member.id]);
        await syncPosCustomerOrderStats(createPgClient(), member.id, Number(order.total) || 0);
      }
    }
  } catch (memberErr) {
    console.error(`[shop] member link failed: order=${order.id}:`, memberErr);
  }

  void sendShopOrderPaidWa({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    total: Number(order.total) || 0,
    accessToken: order.access_token,
    storeOrder: order.shipping_method === "flat" || order.shipping_method === "pickup",
  }).catch((waErr) => console.error(`[shop] WA paid failed: order=${order.id}:`, waErr));
}
