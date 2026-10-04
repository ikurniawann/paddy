import { NextRequest, NextResponse } from "next/server";
import { requirePosMenu } from "@/lib/api/auth";
import { IAM } from "@/lib/iam/prefixes";
import { parseStockQuantity } from "@/lib/pos/store-stock";
import { getApiUserScope } from "@/lib/api/scope";
import {
  canManageLocation,
  listStockLocations,
  listStoreStock,
  loadManageableWarehouseIds,
  setSkuLocationStock,
  StoreStockError,
} from "@/lib/pos/store-stock-server";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

/** Matriks stok varian × lokasi untuk produk multi-toko. */
export async function GET(request: NextRequest) {
  const guard = await requirePosMenu(IAM.posStoreStock);
  if (guard.error) return guard.error;
  try {
    const params = request.nextUrl.searchParams;
    const [locations, products, manageable] = await Promise.all([
      listStockLocations(),
      listStoreStock({
        search: params.get("search"),
        productId: params.get("product_id"),
      }),
      getApiUserScope().then(loadManageableWarehouseIds),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        locations,
        products,
        /** null = semua lokasi bisa diubah; selain itu hanya lokasi ini. */
        manageable_warehouse_ids: manageable ? [...manageable] : null,
      },
    });
  } catch (error) {
    console.error("[store-stock] list failed:", error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

/** Koreksi stok absolut satu varian di satu lokasi. */
export async function PATCH(request: NextRequest) {
  const guard = await requirePosMenu(IAM.posStoreStock);
  if (guard.error) return guard.error;
  try {
    const body = (await request.json()) as {
      sku_id?: string;
      warehouse_id?: string;
      stock_quantity?: unknown;
      note?: string;
    };
    const skuId = String(body.sku_id ?? "").trim();
    const warehouseId = String(body.warehouse_id ?? "").trim();
    const qty = parseStockQuantity(body.stock_quantity);
    if (!skuId || !warehouseId) {
      return NextResponse.json(
        { success: false, error: "Varian dan lokasi wajib diisi" },
        { status: 400 }
      );
    }
    if (qty === null) {
      return NextResponse.json(
        { success: false, error: "Stok harus bilangan bulat 0 atau lebih" },
        { status: 400 }
      );
    }
    const manageable = await loadManageableWarehouseIds(await getApiUserScope());
    if (!canManageLocation(manageable, warehouseId)) {
      return NextResponse.json(
        { success: false, error: "Anda hanya bisa mengoreksi stok di lokasi Anda sendiri" },
        { status: 403 }
      );
    }
    const result = await setSkuLocationStock({
      skuId,
      warehouseId,
      qty,
      userId: guard.userId,
      note: body.note,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof StoreStockError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("[store-stock] set failed:", error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
