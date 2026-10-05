// EPIC-039 Fase D — webhook invoice Xendit utk order toko online.
// Pola booking webhook: verifikasi x-callback-token, cek silang nominal,
// idempoten (UPDATE ... WHERE status='pending'), WA best-effort.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryOne } from '@/lib/db';
import { checkRateLimit, clientIpFrom } from '@/lib/public/rate-limit';
import { isValidWebhookToken } from '@/lib/xendit/client';
import {
  SHOP_INVOICE_PREFIX,
  releaseOrderReservations,
} from '@/lib/shop/storefront-server';
import { afterShopOrderPaid, type PaidShopOrder } from '@/lib/shop/order-paid';

const callbackSchema = z.object({
  id: z.string(),
  external_id: z.string(),
  status: z.string(),
  paid_at: z.string().optional(),
  amount: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  if (!checkRateLimit(`shop-webhook:${ip}`, { limit: 120, windowMs: 60_000 })) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  if (!isValidWebhookToken(request.headers.get('x-callback-token'))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = callbackSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Payload tidak dikenal' }, { status: 400 });
    }
    const callback = parsed.data;

    if (!callback.external_id.startsWith(SHOP_INVOICE_PREFIX)) {
      // Bukan invoice toko online — biarkan webhook lain yang menangani
      return NextResponse.json({ success: true, ignored: true });
    }
    const orderId = callback.external_id.slice(SHOP_INVOICE_PREFIX.length);
    if (!z.string().uuid().safeParse(orderId).success) {
      return NextResponse.json({ success: true, ignored: true });
    }

    if (callback.status === 'PAID' || callback.status === 'SETTLED') {
      // Cek silang nominal — token bocor saja tidak cukup utk menandai lunas
      const expected = await queryOne<{ total: string }>(
        'SELECT total FROM shop.orders WHERE id = $1::uuid',
        [orderId]
      );
      if (!expected) return NextResponse.json({ success: true, ignored: true });
      if (
        callback.amount !== undefined &&
        Math.round(Number(expected.total)) !== Math.round(callback.amount)
      ) {
        console.error(
          `[shop] webhook amount mismatch: order=${orderId} expected=${expected.total} got=${callback.amount}`
        );
        return NextResponse.json({ success: false, error: 'Amount mismatch' }, { status: 400 });
      }

      // Idempoten: hanya transisi pending → paid yang memproses efek samping
      const updated = await queryOne<PaidShopOrder>(
        `UPDATE shop.orders
         SET status = 'paid', paid_at = COALESCE(paid_at, now()), updated_at = now()
         WHERE id = $1::uuid AND status = 'pending'
         RETURNING id, order_number, access_token, customer_name, customer_phone, total, shipping_method`,
        [orderId]
      );
      if (!updated) {
        // Callback ulang — sudah diproses
        return NextResponse.json({ success: true, already_processed: true });
      }

      // Commit stok, tautkan member, WA konfirmasi (lib/shop/order-paid).
      await afterShopOrderPaid(updated);

      return NextResponse.json({ success: true });
    }

    if (callback.status === 'EXPIRED') {
      const cancelled = await queryOne<{ id: string }>(
        `UPDATE shop.orders
         SET status = 'cancelled', updated_at = now()
         WHERE id = $1::uuid AND status = 'pending'
         RETURNING id`,
        [orderId]
      );
      if (cancelled) {
        await releaseOrderReservations(orderId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error: unknown) {
    console.error('[shop] webhook error:', error);
    return NextResponse.json({ success: false, error: 'Webhook error' }, { status: 500 });
  }
}
