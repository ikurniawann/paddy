import { NextResponse } from "next/server";
import { StoreError, uploadPaymentProof } from "@/lib/store/checkout-server";
import { storeError, storeRateLimit } from "@/lib/store/http";

/** Unggah bukti transfer (multipart, field "file": JPG/PNG/WebP ≤ 5 MB). */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limited = storeRateLimit(request, "proof", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return storeError("Pilih foto bukti transfer");
  try {
    await uploadPaymentProof(token, file);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof StoreError) return storeError(error.message, error.status);
    console.error("[store] proof upload failed:", error);
    return storeError("Gagal mengunggah bukti — coba lagi", 500);
  }
}
