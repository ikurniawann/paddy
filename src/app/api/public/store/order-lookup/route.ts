import { NextResponse } from "next/server";
import { findStoreOrderToken } from "@/lib/store/checkout-server";
import { storeError, storeRateLimit } from "@/lib/store/http";

/** Cek pesanan: nomor order + nomor WhatsApp → token halaman status. */
export async function POST(request: Request) {
  const limited = storeRateLimit(request, "lookup", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const body = (await request.json().catch(() => ({}))) as { order_number?: string; phone?: string };
  const token = await findStoreOrderToken(String(body.order_number ?? ""), String(body.phone ?? ""));
  if (!token) return storeError("Pesanan tidak ditemukan — cek nomor order dan nomor WhatsApp", 404);
  return NextResponse.json({ success: true, data: { token } });
}
