import { NextRequest, NextResponse } from "next/server";
import { requirePosMenu } from "@/lib/api/auth";
import { IAM } from "@/lib/iam/prefixes";
import { listSkuMovements } from "@/lib/pos/store-stock-server";

/** Kartu stok varian per lokasi (multi-toko). */
export async function GET(request: NextRequest) {
  const guard = await requirePosMenu(IAM.posStoreStock);
  if (guard.error) return guard.error;
  const params = request.nextUrl.searchParams;
  const skuId = String(params.get("sku_id") ?? "").trim();
  if (!skuId) {
    return NextResponse.json({ success: false, error: "sku_id wajib diisi" }, { status: 400 });
  }
  try {
    const data = await listSkuMovements({
      skuId,
      warehouseId: params.get("warehouse_id"),
      limit: Number(params.get("limit")) || 100,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[store-stock] movements failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
