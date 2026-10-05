import { NextResponse } from "next/server";
import { getStoreOrder } from "@/lib/store/checkout-server";
import { storeError, storeRateLimit } from "@/lib/store/http";

/** Status pesanan untuk pembeli (dipolling halaman status). */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limited = storeRateLimit(request, "order", { limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { token } = await params;
  const order = await getStoreOrder(token);
  if (!order) return storeError("Pesanan tidak ditemukan", 404);
  return NextResponse.json({ success: true, data: order });
}
