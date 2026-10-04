import { createPgClient } from "@/lib/pg/create-client";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  try {
    const { id, termId } = await params;
    const db = createPgClient();

    const { data: term, error: termError } = await db
      .from("purchase_order_payment_terms")
      .select("id, purchase_order_id, paid_amount, status, is_active")
      .eq("id", termId)
      .eq("purchase_order_id", id)
      .single();

    if (termError || !term) {
      return Response.json({ success: false, message: "Termin pembayaran tidak ditemukan" }, { status: 404 });
    }

    if (!term.is_active) {
      return Response.json({ success: false, message: "Termin pembayaran sudah tidak aktif" }, { status: 400 });
    }

    if (Number(term.paid_amount || 0) > 0 || ["partial", "paid"].includes(term.status)) {
      return Response.json(
        { success: false, message: "Termin yang sudah memiliki pembayaran tidak bisa dihapus" },
        { status: 400 }
      );
    }

    const { count, error: paymentError } = await db
      .from("vendor_payments")
      .select("id", { count: "exact", head: true })
      .eq("payment_term_id", termId)
      .neq("status", "void");

    if (paymentError) throw paymentError;
    if ((count || 0) > 0) {
      return Response.json(
        { success: false, message: "Termin yang sudah memiliki riwayat pembayaran tidak bisa dihapus" },
        { status: 400 }
      );
    }

    const { error: updateError } = await db
      .from("purchase_order_payment_terms")
      .update({
        is_active: false,
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", termId)
      .eq("purchase_order_id", id);

    if (updateError) throw updateError;

    return Response.json({ success: true, message: "Termin pembayaran berhasil dihapus" });
  } catch (error: unknown) {
    console.error("Error deleting PO payment term:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal menghapus termin pembayaran") },
      { status: 500 }
    );
  }
}
