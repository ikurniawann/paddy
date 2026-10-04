import { NextRequest, NextResponse } from "next/server";
import { requirePosMenu } from "@/lib/api/auth";
import { IAM } from "@/lib/iam/prefixes";
import { allowedTransferActions, type StockTransferAction } from "@/lib/pos/store-stock";
import {
  getStockTransfer,
  runStockTransferAction,
  StoreStockError,
} from "@/lib/pos/store-stock-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const guard = await requirePosMenu(IAM.posStockTransfers);
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    const transfer = await getStockTransfer(id);
    if (!transfer) {
      return NextResponse.json({ success: false, error: "Transfer tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: transfer });
  } catch (error) {
    console.error("[stock-transfers] detail failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** Jalankan aksi transfer: send (kirim) | receive (terima) | cancel (batal). */
export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requirePosMenu(IAM.posStockTransfers);
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    const body = (await request.json()) as { action?: string };
    const action = String(body.action ?? "") as StockTransferAction;
    const transfer = await getStockTransfer(id);
    if (!transfer) {
      return NextResponse.json({ success: false, error: "Transfer tidak ditemukan" }, { status: 404 });
    }
    if (!allowedTransferActions(transfer.status).includes(action)) {
      return NextResponse.json(
        { success: false, error: `Aksi tidak tersedia untuk transfer berstatus ${transfer.status}` },
        { status: 400 }
      );
    }
    await runStockTransferAction(id, action, guard.userId);
    return NextResponse.json({ success: true, data: await getStockTransfer(id) });
  } catch (error) {
    if (error instanceof StoreStockError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("[stock-transfers] action failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
