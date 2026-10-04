// ============================================
// API ROUTE: /api/purchasing/po/items/[item_id]
// ============================================

import { NextRequest } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";
import { z } from "zod";

const poItemSchema = z.object({
  qty_ordered: z.number().min(0.0001).optional(),
  satuan_id: z.string().uuid().optional().nullable(),
  harga_satuan: z.number().min(0).optional(),
  diskon_item: z.number().min(0).optional(),
  catatan: z.string().optional().nullable(),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// PUT /api/purchasing/po/items/:item_id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ item_id: string }> }
) {
  try {
    const { item_id } = await params;
    const db = await createServerPgClient();
    const body = await request.json();

    // Validasi input
    const validated = poItemSchema.parse(body);

    // Get item dengan info PO
    const { data: item, error: findError } = await db
      .from("purchase_order_items")
      .select(`
        *,
        purchase_order:purchase_order_id (*)
      `)
      .eq("id", item_id)
      .single();

    if (findError || !item) {
      return Response.json(
        { success: false, message: "Item tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek status PO - hanya bisa edit jika draft
    if (item.purchase_order.status !== "draft") {
      return Response.json(
        { success: false, message: "Item hanya bisa diedit saat PO status draft" },
        { status: 400 }
      );
    }

    // Update item
    const { data, error } = await db
      .from("purchase_order_items")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item_id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      data,
      message: "Item berhasil diupdate",
    });
  } catch (error: unknown) {
    console.error("Error updating PO item:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengupdate item PO") },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/po/items/:item_id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ item_id: string }> }
) {
  try {
    const { item_id } = await params;
    const db = await createServerPgClient();

    // Get item dengan info PO
    const { data: item, error: findError } = await db
      .from("purchase_order_items")
      .select(`
        *,
        purchase_order:purchase_order_id (*)
      `)
      .eq("id", item_id)
      .single();

    if (findError || !item) {
      return Response.json(
        { success: false, message: "Item tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek status PO - hanya bisa hapus jika draft
    if (item.purchase_order.status !== "draft") {
      return Response.json(
        { success: false, message: "Item hanya bisa dihapus saat PO status draft" },
        { status: 400 }
      );
    }

    // Soft delete
    const { error } = await db
      .from("purchase_order_items")
      .update({ is_active: false })
      .eq("id", item_id);

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Item berhasil dihapus dari PO",
    });
  } catch (error: unknown) {
    console.error("Error deleting PO item:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal menghapus item PO") },
      { status: 500 }
    );
  }
}
