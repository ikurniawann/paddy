import { NextRequest, NextResponse } from "next/server";
import { requirePosMenu } from "@/lib/api/auth";
import { IAM } from "@/lib/iam/prefixes";
import { normalizeTransferInput } from "@/lib/pos/store-stock";
import { getApiUserScope } from "@/lib/api/scope";
import {
  canManageLocation,
  createStockTransfer,
  listStockTransfers,
  loadManageableWarehouseIds,
  StoreStockError,
} from "@/lib/pos/store-stock-server";

const STATUSES = new Set(["draft", "sent", "received", "cancelled"]);

/** Daftar transfer stok antar toko. */
export async function GET(request: NextRequest) {
  const guard = await requirePosMenu(IAM.posStockTransfers);
  if (guard.error) return guard.error;
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const data = await listStockTransfers({
      status: status && STATUSES.has(status) ? status : null,
      warehouseId: params.get("warehouse_id"),
      allowedWarehouseIds: await loadManageableWarehouseIds(await getApiUserScope()),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[stock-transfers] list failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** Buat transfer (draft, atau langsung kirim bila `send: true`). */
export async function POST(request: NextRequest) {
  const guard = await requirePosMenu(IAM.posStockTransfers);
  if (guard.error) return guard.error;
  try {
    const body = (await request.json()) as {
      from_warehouse_id?: unknown;
      to_warehouse_id?: unknown;
      items?: unknown;
      notes?: string;
      send?: boolean;
    };
    const input = normalizeTransferInput(body);
    if (!input.ok) {
      return NextResponse.json({ success: false, error: input.error }, { status: 400 });
    }
    // Akun toko: transfer harus melibatkan lokasinya (kirim dari toko, atau
    // draft permintaan ke toko). Kirim langsung hanya oleh lokasi asal.
    const manageable = await loadManageableWarehouseIds(await getApiUserScope());
    if (!canManageLocation(manageable, input.fromId) && !canManageLocation(manageable, input.toId)) {
      return NextResponse.json(
        { success: false, error: "Transfer harus dari atau ke lokasi Anda sendiri" },
        { status: 403 }
      );
    }
    if (body.send === true && !canManageLocation(manageable, input.fromId)) {
      return NextResponse.json(
        { success: false, error: "Hanya lokasi asal yang bisa mengirim — simpan sebagai draft permintaan" },
        { status: 403 }
      );
    }
    const transfer = await createStockTransfer({
      fromId: input.fromId,
      toId: input.toId,
      items: input.items,
      notes: body.notes,
      userId: guard.userId,
      send: body.send === true,
    });
    return NextResponse.json({ success: true, data: transfer }, { status: 201 });
  } catch (error) {
    if (error instanceof StoreStockError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("[stock-transfers] create failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
