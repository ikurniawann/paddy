import { z } from "zod";
import { NextResponse } from "next/server";
import { processStoreCheckout } from "@/lib/store/checkout-server";
import { storeError, storeOriginFrom, storeRateLimit } from "@/lib/store/http";

const schema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        sku_id: z.string().uuid().nullable().optional(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(30),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
  }),
  shipping: z.discriminatedUnion("method", [
    z.object({ method: z.literal("pickup"), warehouse_id: z.string().uuid() }),
    z.object({
      method: z.literal("flat"),
      province: z.string().trim().min(2).max(60),
      city: z.string().trim().min(2).max(80),
      postal_code: z.string().trim().max(10).optional(),
      address: z.string().trim().min(10).max(500),
    }),
  ]),
  notes: z.string().trim().max(500).optional(),
});

/** Checkout website toko: ambil di toko / ongkir flat; transfer manual atau Xendit. */
export async function POST(request: Request) {
  const limited = storeRateLimit(request, "checkout", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return storeError(parsed.error.issues[0]?.message ? `Data checkout tidak valid: ${parsed.error.issues[0].path.join(".")}` : "Data checkout tidak valid");
  }
  try {
    const result = await processStoreCheckout({ ...parsed.data, storeOrigin: storeOriginFrom(request) });
    if (!result.ok) return storeError(result.reason, result.status);
    return NextResponse.json(
      {
        success: true,
        data: {
          order_number: result.orderNumber,
          token: result.accessToken,
          invoice_url: result.invoiceUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[store] checkout failed:", error);
    return storeError("Checkout gagal — coba lagi", 500);
  }
}
