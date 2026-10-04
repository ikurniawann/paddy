import { NextRequest, NextResponse } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await createServerPgClient();
    const { id } = await params;

    const { data, error } = await db
      .from("deliveries")
      .select(`
        *,
        po:nomor_po,status,tanggal_po,
        supplier:supplier_id(id,kode,nama_supplier)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error fetching delivery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch delivery" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await createServerPgClient();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await db
      .from("deliveries")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        po:nomor_po,status,
        supplier:supplier_id(id,kode,nama_supplier)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error updating delivery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update delivery" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await createServerPgClient();
    const { id } = await params;

    const { error } = await db
      .from("deliveries")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error cancelling delivery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel delivery" },
      { status: 500 }
    );
  }
}
