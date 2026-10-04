import { createServerPgClient } from "@/lib/pg/create-client";
import { requireUser } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { generatePRNumber } from "@/lib/purchasing/utils";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type PRItemRow = {
  raw_material_id: string;
  satuan_id?: string | null;
  description: string;
  qty: number;
  unit: string;
  estimated_price: number;
  total?: number | null;
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();
    const user = await requireUser();

    const { data: pr, error: prError } = await db
      .from("purchase_requests")
      .select(`
        *,
        items:pr_items(*)
      `)
      .eq("id", id)
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: "PR tidak ditemukan" }, { status: 404 });
    }

    if (pr.status !== "rejected") {
      return NextResponse.json({ error: "Hanya PR rejected yang bisa direvisi" }, { status: 400 });
    }

    const canRevise =
      pr.requester_id === user.id ||
      ["purchasing_manager", "purchasing_admin", "super_admin", "admin"].includes(user.role);

    if (!canRevise) {
      return NextResponse.json({ error: "Anda tidak memiliki akses membuat revisi PR ini" }, { status: 403 });
    }

    const prNumber = await generatePRNumber(db);

    const { data: revisedPR, error: insertError } = await db
      .from("purchase_requests")
      .insert({
        pr_number: prNumber,
        requester_id: user.id,
        department_id: pr.department_id,
        status: "draft",
        total_amount: pr.total_amount || 0,
        priority: pr.priority,
        notes: pr.notes || null,
        required_date: pr.required_date || null,
        current_approval_level: null,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const items = (pr.items || []).map((item: PRItemRow) => ({
      pr_id: revisedPR.id,
      raw_material_id: item.raw_material_id,
      satuan_id: item.satuan_id || null,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      estimated_price: item.estimated_price,
      total: item.total,
    }));

    if (items.length > 0) {
      const { error: itemsError } = await db.from("pr_items").insert(items);
      if (itemsError) throw itemsError;
    }

    return NextResponse.json({ data: { id: revisedPR.id } }, { status: 201 });
  } catch (error) {
    console.error("Error revising PR:", error);
    return NextResponse.json({ error: "Gagal membuat revisi PR" }, { status: 500 });
  }
}
