// EPIC-054 — tampilkan bukti transfer pembeli (file privat) ke admin Ecommerce.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireIamMenuPrefix } from "@/lib/api/auth";
import { IAM } from "@/lib/iam/prefixes";
import { queryOne } from "@/lib/db";
import { readPrivateFile, sniffImageMime } from "@/lib/storage-private";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireIamMenuPrefix(IAM.shop);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ success: false, error: "Order tidak ditemukan" }, { status: 404 });
    }
    const order = await queryOne<{ payment_proof_url: string | null }>(
      "SELECT payment_proof_url FROM shop.orders WHERE id = $1::uuid",
      [id]
    );
    if (!order?.payment_proof_url) {
      return NextResponse.json({ success: false, error: "Belum ada bukti transfer" }, { status: 404 });
    }
    const file = await readPrivateFile(order.payment_proof_url);
    if (!file.data) {
      return NextResponse.json({ success: false, error: "File bukti tidak ditemukan" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": sniffImageMime(file.data) ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return error.toResponse();
    console.error("[shop] payment proof error:", error);
    return NextResponse.json({ success: false, error: "Gagal memuat bukti" }, { status: 500 });
  }
}
