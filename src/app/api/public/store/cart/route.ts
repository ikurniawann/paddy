import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartSnapshot } from "@/lib/store/catalog-server";
import { storeError, storeRateLimit } from "@/lib/store/http";

const schema = z.object({
  items: z
    .array(z.object({ product_id: z.string().uuid(), sku_id: z.string().uuid().nullable().optional() }))
    .max(50),
});

/** Harga & stok terbaru isi keranjang (keranjang disimpan di browser). */
export async function POST(request: Request) {
  const limited = storeRateLimit(request, "cart", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return storeError("Data keranjang tidak valid");
  const lines = await getCartSnapshot(parsed.data.items);
  return NextResponse.json({ success: true, data: lines });
}
